// ==UserScript==
// @name         九州自动洗练助手
// @namespace    https://tampermonkey.net/
// @version      0.3.0
// @description  在九州站点中为装备提供自动洗练/强化/精炼面板，支持延时、多规则、自动成长与停止条件
// @author       Codex
// @match        https://jz.faith.wang/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'jiuzhou_auto_reroll_state_v2';
  const PANEL_ID = 'tm-jiuzhou-auto-reroll-panel';
  const OVERLAY_ID = 'tm-jiuzhou-auto-reroll-overlay';
  const ENTRY_ID = 'tm-jiuzhou-auto-reroll-entry';
  const STYLE_ID = 'tm-jiuzhou-auto-reroll-style';
  const MENU_TEXTS = ['排行', '成就', '挂机'];
  const QUALITY_LABELS = { 1: '黄', 2: '玄', 3: '地', 4: '天' };
  const MAX_AFFIX_TIER = 13;
  const MAX_ENHANCE_TARGET_LEVEL = 99;
  const MAX_REFINE_LEVEL = 10;
  const TASK_LABELS = {
    reroll: '自动洗练',
    enhance: '自动强化',
    refine: '自动精炼',
  };
  const MATCH_MODE_TEXT = {
    any: '任意一条规则满足即停止',
    all: '所有规则都满足才停止',
  };

  const state = {
    open: false,
    loading: false,
    running: false,
    currentTask: null,
    inventory: [],
    allItems: [],
    itemId: null,
    currentItem: null,
    currentAffixes: [],
    currentLockIndexes: [],
    poolPreview: [],
    growthPreview: {
      enhance: null,
      refine: null,
    },
    growthLoading: false,
    rulesMatchMode: 'all',
    rules: [],
    delayMinMs: 600,
    delayMaxMs: 1200,
    maxAttempts: 100,
    targetEnhanceLevel: 10,
    targetRefineLevel: 10,
    attempts: 0,
    lastResultText: '',
    logs: [],
    debug: [],
  };

  let panelEl = null;
  let overlayEl = null;
  let contentEl = null;
  let stopRequested = false;
  let navObserver = null;

  function toInt(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? Math.floor(num) : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function randomDelay(minMs, maxMs) {
    const min = clamp(toInt(minMs, 0), 0, 60000);
    const max = clamp(toInt(maxMs, min), min, 60000);
    if (max <= min) return min;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function persistState() {
    const payload = JSON.stringify({
      open: state.open,
      itemId: state.itemId,
      currentLockIndexes: state.currentLockIndexes,
      rulesMatchMode: state.rulesMatchMode,
      rules: state.rules,
      delayMinMs: state.delayMinMs,
      delayMaxMs: state.delayMaxMs,
      maxAttempts: state.maxAttempts,
      targetEnhanceLevel: state.targetEnhanceLevel,
      targetRefineLevel: state.targetRefineLevel,
    });
    try {
      if (typeof GM_setValue === 'function') {
        GM_setValue(STORAGE_KEY, payload);
      } else {
        localStorage.setItem(STORAGE_KEY, payload);
      }
    } catch (error) {
      console.warn('[九州自动洗练] 保存失败', error);
    }
  }

  function loadState() {
    try {
      const raw = typeof GM_getValue === 'function'
        ? GM_getValue(STORAGE_KEY, '')
        : localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!saved || typeof saved !== 'object') return;
      state.open = !!saved.open;
      state.itemId = toInt(saved.itemId, null);
      state.currentLockIndexes = Array.isArray(saved.currentLockIndexes)
        ? saved.currentLockIndexes.map((value) => toInt(value, -1)).filter((value) => value >= 0)
        : [];
      state.rulesMatchMode = saved.rulesMatchMode === 'any' ? 'any' : 'all';
      state.rules = Array.isArray(saved.rules)
        ? saved.rules.map(normalizeRule).filter(Boolean)
        : [];
      state.delayMinMs = clamp(toInt(saved.delayMinMs, 600), 0, 60000);
      state.delayMaxMs = clamp(toInt(saved.delayMaxMs, 1200), 0, 60000);
      state.maxAttempts = clamp(toInt(saved.maxAttempts, 100), 1, 100000);
      state.targetEnhanceLevel = clamp(toInt(saved.targetEnhanceLevel, 10), 1, MAX_ENHANCE_TARGET_LEVEL);
      state.targetRefineLevel = clamp(toInt(saved.targetRefineLevel, MAX_REFINE_LEVEL), 1, MAX_REFINE_LEVEL);
    } catch (error) {
      console.warn('[九州自动洗练] 读取失败', error);
    }
  }

  function normalizeRule(rule) {
    if (!rule || typeof rule !== 'object') return null;
    return {
      id: String(rule.id || `${Date.now()}_${Math.random().toString(16).slice(2)}`),
      affixKey: String(rule.affixKey || '').trim(),
      nameKeyword: String(rule.nameKeyword || '').trim(),
      minTier: clamp(toInt(rule.minTier, 0), 0, MAX_AFFIX_TIER),
      minRollPercent: clamp(Number(rule.minRollPercent || 0) || 0, 0, 100),
      enabled: rule.enabled !== false,
    };
  }

  function ensureDefaultRule() {
    if (state.rules.length > 0) return;
    state.rules = [normalizeRule({})];
  }

  function isRuleConfigured(rule) {
    return !!(rule?.affixKey || rule?.nameKeyword || rule?.minTier > 0 || rule?.minRollPercent > 0);
  }

  function getEffectiveRules() {
    return state.rules.filter((rule) => rule.enabled && isRuleConfigured(rule));
  }

  function log(message) {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    state.logs.unshift(`[${time}] ${message}`);
    state.logs = state.logs.slice(0, 12);
    render();
  }

  function debug(message) {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    state.debug.unshift(`[${time}] ${message}`);
    state.debug = state.debug.slice(0, 10);
    render();
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  async function apiGet(path) {
    const errors = [];
    for (const candidate of buildApiCandidates(path)) {
      try {
        const headers = { Accept: 'application/json' };
        const token = localStorage.getItem('token');
        if (token) headers.Authorization = `Bearer ${token}`;
        const resp = await fetch(candidate, {
          method: 'GET',
          credentials: 'include',
          headers,
        });
        const data = await resp.json();
        debug(`GET ${candidate} -> ${resp.status}`);
        if (resp.ok || data?.success !== undefined) {
          return data;
        }
        errors.push(`${candidate} -> HTTP ${resp.status}`);
      } catch (error) {
        errors.push(`${candidate} -> ${error.message || error}`);
        debug(`GET ${candidate} -> ${error.message || error}`);
      }
    }
    throw new Error(errors.join(' | ') || 'GET 请求失败');
  }

  async function apiPost(path, body) {
    const errors = [];
    for (const candidate of buildApiCandidates(path)) {
      try {
        const headers = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        };
        const token = localStorage.getItem('token');
        if (token) headers.Authorization = `Bearer ${token}`;
        const resp = await fetch(candidate, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify(body || {}),
        });
        const data = await resp.json();
        debug(`POST ${candidate} -> ${resp.status}`);
        if (resp.ok || data?.success !== undefined) {
          return data;
        }
        errors.push(`${candidate} -> HTTP ${resp.status}`);
      } catch (error) {
        errors.push(`${candidate} -> ${error.message || error}`);
        debug(`POST ${candidate} -> ${error.message || error}`);
      }
    }
    throw new Error(errors.join(' | ') || 'POST 请求失败');
  }

  function buildApiCandidates(path) {
    const normalized = String(path || '').trim();
    if (!normalized) return [];
    const direct = normalized.startsWith('/') ? normalized : `/${normalized}`;
    const withApi = direct.startsWith('/api/') ? direct : `/api${direct}`;
    return [...new Set([withApi, direct])];
  }

  function normalizeAffixes(raw) {
    let value = raw;
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        value = [];
      }
    }
    if (!Array.isArray(value)) return [];
    return value
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        key: String(item.key || '').trim(),
        name: String(item.name || '').trim(),
        tier: toInt(item.tier, 0),
        value: Number(item.value || 0) || 0,
        rollPercent: Number(
          item.roll_percent !== undefined
            ? item.roll_percent
            : item.rollPercent !== undefined
              ? item.rollPercent
              : 0
        ) || 0,
      }))
      .filter((item) => item.key);
  }

  function isEquipmentItem(item) {
    if (!item || typeof item !== 'object') return false;
    if (item.category === 'equipment') return true;
    if (item.def?.category === 'equipment') return true;
    if (item.item_def?.category === 'equipment') return true;
    const equipSlot = String(item.equip_slot || item.def?.equip_slot || item.item_def?.equip_slot || '').trim();
    if (equipSlot) return true;
    return false;
  }

  async function loadItemsByLocation(location) {
    const params = new URLSearchParams({
      location,
      page: '1',
      pageSize: '200',
    });
    const result = await apiGet(`/inventory/items?${params.toString()}`);
    const items = Array.isArray(result?.data?.items) ? result.data.items : [];
    return items;
  }

  function qualityText(item) {
    const rank = toInt(item.quality_rank, null);
    if (rank && QUALITY_LABELS[rank]) return QUALITY_LABELS[rank];
    return String(item.quality || '').trim() || '?';
  }

  function getStrengthenLevel(item) {
    return Math.max(0, toInt(
      item?.strengthen_level ?? item?.equip?.strengthenLevel ?? item?.strengthenLevel,
      0
    ));
  }

  function getRefineLevel(item) {
    return Math.max(0, toInt(
      item?.refine_level ?? item?.equip?.refineLevel ?? item?.refineLevel,
      0
    ));
  }

  function formatGrowthLevelText(item) {
    return `强化+${getStrengthenLevel(item)} / 精炼+${getRefineLevel(item)}`;
  }

  function getItemDefId(item) {
    return String(item?.item_def_id || item?.itemDefId || item?.def?.id || item?.item_def?.id || '').trim();
  }

  function getItemLocation(item) {
    return String(item?.location || '').trim();
  }

  function itemLabel(item) {
    const slot = String(item.equip_slot || item.def?.equip_slot || item.item_def?.equip_slot || '').trim() || '未知部位';
    const name = item.name || item.def?.name || item.item_def?.name || item.item_def_id || '未命名装备';
    return `[${qualityText(item)}] ${name} (#${item.id}) - ${slot} - ${formatGrowthLevelText(item)}`;
  }

  async function loadInventory() {
    state.loading = true;
    render();
    try {
      let collected = [];

      try {
        const result = await apiGet('/inventory/bag/snapshot');
        const bagItems = Array.isArray(result?.data?.bagItems) ? result.data.bagItems : [];
        const equippedItems = Array.isArray(result?.data?.equippedItems) ? result.data.equippedItems : [];
        collected = [...bagItems, ...equippedItems];
        debug(`snapshot 装备候选 ${collected.length} 条`);
      } catch (error) {
        debug(`snapshot 失败: ${error.message || error}`);
      }

      if (collected.length <= 0) {
        const [bagItems, equippedItems] = await Promise.all([
          loadItemsByLocation('bag').catch((error) => {
            debug(`items bag 失败: ${error.message || error}`);
            return [];
          }),
          loadItemsByLocation('equipped').catch((error) => {
            debug(`items equipped 失败: ${error.message || error}`);
            return [];
          }),
        ]);
        collected = [...bagItems, ...equippedItems];
        debug(`items 回退候选 ${collected.length} 条`);
      }

      state.allItems = collected;
      state.inventory = collected
        .filter((item) => isEquipmentItem(item))
        .sort((a, b) => {
          const qa = toInt(a.quality_rank, 0);
          const qb = toInt(b.quality_rank, 0);
          if (qa !== qb) return qb - qa;
          return String(a.name || '').localeCompare(String(b.name || ''), 'zh-Hans-CN');
        });

      if (state.itemId !== null) {
        const found = state.inventory.find((item) => Number(item.id) === Number(state.itemId));
        if (found) {
          setCurrentItem(found, false);
        } else {
          state.itemId = null;
          state.currentItem = null;
          state.currentAffixes = [];
          state.currentLockIndexes = [];
          state.poolPreview = [];
          state.growthPreview = { enhance: null, refine: null };
        }
      }

      if (!state.currentItem && state.inventory.length > 0) {
        setCurrentItem(state.inventory[0], false);
      }
      log(`已加载装备 ${state.inventory.length} 件`);
    } catch (error) {
      console.error(error);
      log('加载装备失败，请确认已登录游戏');
    } finally {
      state.loading = false;
      persistState();
      render();
    }
  }

  async function loadPoolPreview(itemId) {
    const result = await apiPost('/inventory/reroll-affixes/pool-preview', { itemId });
    if (!result?.success || !result?.data) {
      throw new Error(result?.message || '获取词条池失败');
    }
    state.poolPreview = Array.isArray(result.data.affixes) ? result.data.affixes : [];
  }

  function countBagItemByDefId(itemDefId) {
    if (!itemDefId) return 0;
    return state.allItems.reduce((sum, item) => {
      if (getItemLocation(item) !== 'bag') return sum;
      if (getItemDefId(item) !== itemDefId) return sum;
      return sum + Math.max(0, Number(item.qty || 0) || 0);
    }, 0);
  }

  function normalizeGrowthStage(stage) {
    if (!stage || typeof stage !== 'object') return null;
    const costs = stage.costs && typeof stage.costs === 'object' ? stage.costs : null;
    const materialItemDefId = costs ? String(costs.materialItemDefId || '').trim() : '';
    return {
      currentLevel: Math.max(0, toInt(stage.currentLevel, 0)),
      targetLevel: Math.max(0, toInt(stage.targetLevel, 0)),
      maxLevel: stage.maxLevel === null || stage.maxLevel === undefined
        ? null
        : Math.max(0, toInt(stage.maxLevel, 0)),
      successRate: Number(stage.successRate || 0) || 0,
      failMode: ['destroy', 'downgrade'].includes(stage.failMode) ? stage.failMode : 'none',
      costs: costs
        ? {
            materialItemDefId,
            materialName: String(costs.materialName || materialItemDefId || '未知材料').trim() || materialItemDefId || '未知材料',
            materialQty: Math.max(0, toInt(costs.materialQty, 0)),
            silverCost: Math.max(0, Number(costs.silverCost || 0) || 0),
            spiritStoneCost: Math.max(0, Number(costs.spiritStoneCost || 0) || 0),
            owned: materialItemDefId ? countBagItemByDefId(materialItemDefId) : 0,
          }
        : null,
      previewBaseAttrs: stage.previewBaseAttrs && typeof stage.previewBaseAttrs === 'object'
        ? stage.previewBaseAttrs
        : {},
    };
  }

  async function loadGrowthPreview(itemId, options = {}) {
    const { silent = false } = options;
    state.growthLoading = true;
    if (!silent) render();
    try {
      const result = await apiPost('/inventory/growth/cost-preview', { itemId });
      if (!result?.success || !result?.data) {
        throw new Error(result?.message || '获取强化/精炼预览失败');
      }
      state.growthPreview = {
        enhance: normalizeGrowthStage(result.data.enhance),
        refine: normalizeGrowthStage(result.data.refine),
      };
      return state.growthPreview;
    } catch (error) {
      state.growthPreview = { enhance: null, refine: null };
      throw error;
    } finally {
      state.growthLoading = false;
      if (!silent) render();
    }
  }

  function updateCurrentItemPatch(patch) {
    if (!patch || typeof patch !== 'object') return;
    if (state.currentItem && Number(state.currentItem.id) === Number(state.itemId)) {
      state.currentItem = { ...state.currentItem, ...patch };
    }
    state.inventory = state.inventory.map((item) => (
      Number(item.id) === Number(state.itemId) ? { ...item, ...patch } : item
    ));
    state.allItems = state.allItems.map((item) => (
      Number(item.id) === Number(state.itemId) ? { ...item, ...patch } : item
    ));
  }

  function consumeLocalMaterial(usedMaterial) {
    if (!usedMaterial || typeof usedMaterial !== 'object') return;
    const itemDefId = String(usedMaterial.itemDefId || '').trim();
    let remaining = Math.max(0, toInt(usedMaterial.qty, 0));
    if (!itemDefId || remaining <= 0) return;
    state.allItems = state.allItems
      .map((item) => {
        if (remaining <= 0) return item;
        if (getItemLocation(item) !== 'bag') return item;
        if (getItemDefId(item) !== itemDefId) return item;
        const currentQty = Math.max(0, Number(item.qty || 0) || 0);
        if (currentQty <= 0) return item;
        const spent = Math.min(currentQty, remaining);
        remaining -= spent;
        return { ...item, qty: currentQty - spent };
      })
      .filter((item) => (
        getItemLocation(item) !== 'bag'
        || !getItemDefId(item)
        || Math.max(0, Number(item.qty || 0) || 0) > 0
        || isEquipmentItem(item)
      ));
  }

  function setCurrentItem(item, shouldRender = true) {
    const nextItemId = Number(item.id);
    const itemChanged = Number(state.itemId) !== nextItemId;
    state.itemId = Number(item.id);
    state.currentItem = item;
    state.currentAffixes = normalizeAffixes(item.affixes);
    state.currentLockIndexes = itemChanged
      ? []
      : state.currentLockIndexes.filter((index) => index >= 0 && index < state.currentAffixes.length);
    state.poolPreview = [];
    state.growthPreview = { enhance: null, refine: null };
    persistState();
    if (shouldRender) render();
    void Promise.allSettled([
      loadPoolPreview(state.itemId),
      loadGrowthPreview(state.itemId, { silent: true }),
    ]).then((results) => {
      const [poolResult, growthResult] = results;
      if (poolResult?.status === 'fulfilled') {
        log(`已读取词条池：${itemLabel(item)}`);
      } else if (poolResult?.status === 'rejected') {
        console.warn(poolResult.reason);
        log(`读取词条池失败：${poolResult.reason?.message || poolResult.reason}`);
      }
      if (growthResult?.status === 'rejected') {
        console.warn(growthResult.reason);
        log(`读取强化/精炼预览失败：${growthResult.reason?.message || growthResult.reason}`);
      }
      render();
    });
  }

  function matchesRule(affix, rule) {
    if (!rule.enabled || !isRuleConfigured(rule)) return false;
    if (rule.affixKey && affix.key !== rule.affixKey) return false;
    if (rule.nameKeyword) {
      const haystack = `${affix.name} ${affix.key}`.toLowerCase();
      if (!haystack.includes(rule.nameKeyword.toLowerCase())) return false;
    }
    if (rule.minTier > 0 && affix.tier < rule.minTier) return false;
    if (rule.minRollPercent > 0 && affix.rollPercent < rule.minRollPercent) return false;
    return true;
  }

  function evaluateStop(affixes) {
    const activeRules = getEffectiveRules();
    if (activeRules.length <= 0) {
      return { matched: false, detail: '请至少配置一条启用中的规则' };
    }
    const rows = activeRules.map((rule) => ({
      matched: affixes.some((affix) => matchesRule(affix, rule)),
    }));
    const matched = state.rulesMatchMode === 'any'
      ? rows.some((row) => row.matched)
      : rows.every((row) => row.matched);
    const detail = rows.map((row, index) => `${row.matched ? '✓' : '✗'}规则${index + 1}`).join(' / ');
    return { matched, detail };
  }

  async function rerollOnce() {
    const result = await apiPost('/inventory/reroll-affixes', {
      itemId: state.itemId,
      lockIndexes: [...state.currentLockIndexes].sort((a, b) => a - b),
    });
    if (!result?.success || !result?.data) {
      throw new Error(result?.message || '洗练失败');
    }
    state.currentAffixes = normalizeAffixes(result.data.affixes);
    state.currentLockIndexes = Array.isArray(result.data.lockIndexes)
      ? result.data.lockIndexes.map((value) => toInt(value, -1)).filter((value) => value >= 0)
      : state.currentLockIndexes;
    updateCurrentItemPatch({ affixes: result.data.affixes });
    state.lastResultText = result.message || 'ok';
  }

  function beginAutoTask(task) {
    stopRequested = false;
    state.running = true;
    state.currentTask = task;
    state.attempts = 0;
    render();
  }

  function finishAutoTask() {
    state.running = false;
    state.currentTask = null;
    persistState();
    render();
    void loadInventory();
  }

  function getTaskLabel(task = state.currentTask) {
    return TASK_LABELS[task] || '自动流程';
  }

  function getGrowthActionLabel(mode) {
    return mode === 'enhance' ? '强化' : '精炼';
  }

  function getGrowthStage(mode) {
    return state.growthPreview[mode] || null;
  }

  function getGrowthTargetLevel(mode) {
    return mode === 'enhance' ? state.targetEnhanceLevel : state.targetRefineLevel;
  }

  function formatPercent(value) {
    const num = Number(value || 0) || 0;
    const percent = num <= 1 ? num * 100 : num;
    return `${percent.toFixed(2)}%`;
  }

  function formatNumber(value) {
    return (Number(value || 0) || 0).toLocaleString('zh-CN');
  }

  function getGrowthFailModeText(failMode) {
    if (failMode === 'destroy') return '失败碎装';
    if (failMode === 'downgrade') return '失败降级';
    return '无惩罚';
  }

  function getGrowthPreviewSummary(mode) {
    const actionLabel = getGrowthActionLabel(mode);
    const stage = getGrowthStage(mode);
    if (!state.currentItem) return `请选择装备查看${actionLabel}预览`;
    if (state.growthLoading && !stage) return `${actionLabel}预览加载中...`;
    if (!stage) return `${actionLabel}预览不可用`;
    const parts = [
      `${actionLabel}：+${stage.currentLevel} → +${stage.targetLevel}`,
      `成功率 ${formatPercent(stage.successRate)}`,
    ];
    if (stage.maxLevel !== null) {
      parts.push(`上限 +${stage.maxLevel}`);
    }
    if (stage.failMode && stage.failMode !== 'none') {
      parts.push(getGrowthFailModeText(stage.failMode));
    }
    if (stage.costs) {
      parts.push(`${stage.costs.materialName} x${stage.costs.materialQty} / 拥有 ${stage.costs.owned}`);
      if (stage.costs.silverCost > 0) parts.push(`银两 ${formatNumber(stage.costs.silverCost)}`);
      if (stage.costs.spiritStoneCost > 0) parts.push(`灵石 ${formatNumber(stage.costs.spiritStoneCost)}`);
    }
    return parts.join('；');
  }

  function getGrowthStopReason(mode, stage, targetLevel) {
    if (!stage) return `${getGrowthActionLabel(mode)}预览不可用`;
    if (stage.currentLevel >= targetLevel) {
      return `当前${getGrowthActionLabel(mode)}等级 +${stage.currentLevel} 已达到目标 +${targetLevel}`;
    }
    if (stage.maxLevel !== null && stage.currentLevel >= stage.maxLevel) {
      return `${getGrowthActionLabel(mode)}已达到上限 +${stage.maxLevel}`;
    }
    if (!stage.costs && !(stage.maxLevel !== null && stage.currentLevel >= stage.maxLevel)) {
      return `${getGrowthActionLabel(mode)}预览缺少消耗数据`;
    }
    if (stage.costs && stage.costs.materialQty > 0 && stage.costs.owned < stage.costs.materialQty) {
      return `${getGrowthActionLabel(mode)}材料不足：${stage.costs.materialName} 需要 ${stage.costs.materialQty}，拥有 ${stage.costs.owned}`;
    }
    return '';
  }

  function isRetryableGrowthFailure(mode, result) {
    const message = String(result?.message || '').trim();
    return mode === 'enhance' ? message === '强化失败' : message === '精炼失败';
  }

  function shouldApplyGrowthResult(mode, result) {
    if (!result || typeof result !== 'object') return false;
    if (result.success) return true;
    if (mode === 'enhance' && result?.data?.destroyed) return true;
    return isRetryableGrowthFailure(mode, result);
  }

  function applyGrowthResult(mode, result) {
    if (!shouldApplyGrowthResult(mode, result)) return;
    if (mode === 'enhance') {
      const level = result?.data?.strengthenLevel;
      if (level !== undefined) {
        updateCurrentItemPatch({ strengthen_level: level });
      }
    } else {
      const level = result?.data?.refineLevel;
      if (level !== undefined) {
        updateCurrentItemPatch({ refine_level: level });
      }
    }
    if (result?.data?.usedMaterial) {
      consumeLocalMaterial(result.data.usedMaterial);
    }
  }

  function summarizeGrowthAttempt(mode, result) {
    const parts = [result?.message || `${getGrowthActionLabel(mode)}完成`];
    if (mode === 'enhance') {
      if (result?.data?.destroyed) {
        parts.push('装备已碎');
      } else if (result?.data?.strengthenLevel !== undefined && result?.data?.strengthenLevel !== null) {
        parts.push(`当前强化 +${Math.max(0, toInt(result.data.strengthenLevel, 0))}`);
      }
    } else if (result?.data?.refineLevel !== undefined) {
      parts.push(`当前精炼 +${Math.max(0, toInt(result.data.refineLevel, 0))}`);
    }
    if (result?.data?.successRate !== undefined) {
      parts.push(`成功率 ${formatPercent(result.data.successRate)}`);
    }
    if (result?.data?.roll !== undefined) {
      parts.push(`掷点 ${formatPercent(result.data.roll)}`);
    }
    return parts.join('；');
  }

  async function enhanceOnce() {
    const result = await apiPost('/inventory/enhance', { itemId: state.itemId });
    state.lastResultText = result?.message || 'ok';
    return result;
  }

  async function refineOnce() {
    const result = await apiPost('/inventory/refine', { itemId: state.itemId });
    state.lastResultText = result?.message || 'ok';
    return result;
  }

  async function refreshGrowthPreviewForCurrentItem(silent = true) {
    if (!state.itemId) return null;
    return loadGrowthPreview(state.itemId, { silent });
  }

  async function startAutoReroll() {
    if (state.running) return;
    if (!state.itemId) {
      log('请先选择装备');
      return;
    }
    ensureDefaultRule();
    if (getEffectiveRules().length <= 0) {
      log('请至少配置一条启用中的规则');
      return;
    }

    beginAutoTask('reroll');

    try {
      const initial = evaluateStop(state.currentAffixes);
      if (initial.matched) {
        log(`当前词缀已满足停止条件：${initial.detail}`);
        return;
      }

      while (!stopRequested && state.attempts < state.maxAttempts) {
        state.attempts += 1;
        render();
        await rerollOnce();
        const evaluation = evaluateStop(state.currentAffixes);
        const summary = state.currentAffixes
          .map((affix) => `${affix.name || affix.key}(T${affix.tier}, ${affix.rollPercent.toFixed(2)}%)`)
          .join('，');
        log(`第 ${state.attempts} 次：${summary || '无词缀'}；${evaluation.detail}`);
        render();

        if (evaluation.matched) {
          log(`已满足停止条件，自动洗练结束（第 ${state.attempts} 次）`);
          break;
        }
        if (state.attempts >= state.maxAttempts) {
          log(`达到最大尝试次数 ${state.maxAttempts}，自动停止`);
          break;
        }

        const waitMs = randomDelay(state.delayMinMs, state.delayMaxMs);
        if (waitMs > 0) {
          await sleep(waitMs);
        }
      }
    } catch (error) {
      console.error(error);
      log(`自动洗练中断：${error.message || error}`);
    } finally {
      finishAutoTask();
    }
  }

  async function startAutoGrowth(mode) {
    if (state.running) return;
    if (!state.itemId) {
      log('请先选择装备');
      return;
    }

    try {
      await loadGrowthPreview(state.itemId);
    } catch (error) {
      console.error(error);
      log(`读取${getGrowthActionLabel(mode)}预览失败：${error.message || error}`);
      return;
    }

    const targetLevel = getGrowthTargetLevel(mode);
    const initialStage = getGrowthStage(mode);
    const initialStopReason = getGrowthStopReason(mode, initialStage, targetLevel);
    if (initialStopReason) {
      log(initialStopReason);
      return;
    }

    beginAutoTask(mode);
    try {
      while (!stopRequested && state.attempts < state.maxAttempts) {
        const stageBefore = getGrowthStage(mode);
        const stopReasonBefore = getGrowthStopReason(mode, stageBefore, targetLevel);
        if (stopReasonBefore) {
          log(stopReasonBefore);
          break;
        }

        state.attempts += 1;
        render();

        const result = mode === 'enhance'
          ? await enhanceOnce()
          : await refineOnce();

        applyGrowthResult(mode, result);
        log(`第 ${state.attempts} 次${getGrowthActionLabel(mode)}：${summarizeGrowthAttempt(mode, result)}`);
        render();

        if (result?.data?.destroyed) {
          log('强化失败且装备已碎，自动强化停止');
          break;
        }
        if (!result?.success && !isRetryableGrowthFailure(mode, result)) {
          log(`自动${getGrowthActionLabel(mode)}停止：${result?.message || '操作失败'}`);
          break;
        }

        await refreshGrowthPreviewForCurrentItem();
        render();

        const stageAfter = getGrowthStage(mode);
        const stopReasonAfter = getGrowthStopReason(mode, stageAfter, targetLevel);
        if (stopReasonAfter) {
          log(stopReasonAfter);
          break;
        }
        if (state.attempts >= state.maxAttempts) {
          log(`达到最大尝试次数 ${state.maxAttempts}，自动停止`);
          break;
        }

        const waitMs = randomDelay(state.delayMinMs, state.delayMaxMs);
        if (waitMs > 0) {
          await sleep(waitMs);
        }
      }
    } catch (error) {
      console.error(error);
      log(`自动${getGrowthActionLabel(mode)}中断：${error.message || error}`);
    } finally {
      finishAutoTask();
    }
  }

  function stopAutoTask() {
    stopRequested = true;
    state.running = false;
    render();
    log(`已请求停止${getTaskLabel()}`);
  }

  function addRule() {
    state.rules.push(normalizeRule({}));
    persistState();
    render();
  }

  function removeRule(ruleId) {
    state.rules = state.rules.filter((rule) => rule.id !== ruleId);
    ensureDefaultRule();
    persistState();
    render();
  }

  function updateRule(ruleId, patch) {
    state.rules = state.rules.map((rule) => (
      rule.id === ruleId ? normalizeRule({ ...rule, ...patch }) : rule
    ));
    persistState();
  }

  function buildAffixOptionsHtml(selectedKey) {
    const map = new Map();
    state.poolPreview.forEach((affix) => {
      const key = String(affix.key || '').trim();
      if (!key || map.has(key)) return;
      map.set(key, `${affix.name || key}（${key}）`);
    });
    state.currentAffixes.forEach((affix) => {
      if (!affix.key || map.has(affix.key)) return;
      map.set(affix.key, `${affix.name || affix.key}（${affix.key}）`);
    });
    const rows = ['<option value="">不限词缀</option>'];
    [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'zh-Hans-CN'))
      .forEach(([key, label]) => {
        rows.push(`<option value="${escapeHtml(key)}"${key === selectedKey ? ' selected' : ''}>${escapeHtml(label)}</option>`);
      });
    return rows.join('');
  }

  function render() {
    if (!contentEl) return;
    const hasUnconfiguredRule = state.rules.some((rule) => rule.enabled && !isRuleConfigured(rule));
    const enhancePreviewText = getGrowthPreviewSummary('enhance');
    const refinePreviewText = getGrowthPreviewSummary('refine');
    const canStartTask = !state.running && !!state.itemId;
    const runningLabel = state.running ? getTaskLabel() : '空闲';
    const rulesHtml = state.rules.map((rule, index) => `
      <div class="tm-jar-rule" data-rule-id="${escapeHtml(rule.id)}">
        <div class="tm-jar-rule-head">
          <strong>规则 ${index + 1}</strong>
          <label class="tm-jar-inline"><input type="checkbox" data-action="toggle-rule" data-rule-id="${escapeHtml(rule.id)}" ${rule.enabled ? 'checked' : ''}/>启用</label>
          <button type="button" data-action="remove-rule" data-rule-id="${escapeHtml(rule.id)}">删除</button>
        </div>
        <div class="tm-jar-grid">
          <label>
            <span>词缀</span>
            <select data-action="rule-affix" data-rule-id="${escapeHtml(rule.id)}">
              ${buildAffixOptionsHtml(rule.affixKey)}
            </select>
          </label>
          <label>
            <span>名称关键词</span>
            <input data-action="rule-keyword" data-rule-id="${escapeHtml(rule.id)}" value="${escapeHtml(rule.nameKeyword)}" placeholder="如：追魂、暴怒"/>
          </label>
          <label>
            <span>最低 T 阶</span>
            <input type="number" min="0" max="${MAX_AFFIX_TIER}" data-action="rule-tier" data-rule-id="${escapeHtml(rule.id)}" value="${rule.minTier}"/>
          </label>
          <label>
            <span>最低 Roll%</span>
            <input type="number" min="0" max="100" step="0.01" data-action="rule-roll" data-rule-id="${escapeHtml(rule.id)}" value="${rule.minRollPercent}"/>
          </label>
        </div>
      </div>
    `).join('');

    const affixesHtml = state.currentAffixes.length > 0
      ? state.currentAffixes.map((affix, index) => `
          <label class="tm-jar-affix">
            <input type="checkbox" data-action="toggle-lock" data-index="${index}" ${state.currentLockIndexes.includes(index) ? 'checked' : ''} ${state.running ? 'disabled' : ''}/>
            <span class="tm-jar-affix-main">${escapeHtml(affix.name || affix.key)}</span>
            <span class="tm-jar-affix-meta">T${affix.tier} / Roll ${affix.rollPercent.toFixed(2)}%</span>
          </label>
        `).join('')
      : '<div class="tm-jar-empty">当前装备暂无词缀</div>';

    const inventoryOptions = ['<option value="">请选择装备</option>']
      .concat(state.inventory.map((item) => `<option value="${item.id}" ${Number(item.id) === Number(state.itemId) ? 'selected' : ''}>${escapeHtml(itemLabel(item))}</option>`))
      .join('');

    contentEl.innerHTML = `
      <div class="tm-jar-toolbar">
        <button type="button" data-action="close">关闭</button>
        <button type="button" data-action="refresh" ${state.loading || state.running ? 'disabled' : ''}>刷新装备</button>
      </div>
      <div class="tm-jar-body">
        <div class="tm-jar-layout">
          <div class="tm-jar-col">
            <section>
              <div class="tm-jar-section-title">装备</div>
              <label>
                <span>选择装备</span>
                <select data-action="item-select" ${state.loading || state.running ? 'disabled' : ''}>${inventoryOptions}</select>
              </label>
              <div class="tm-jar-current">${state.currentItem ? escapeHtml(itemLabel(state.currentItem)) : '未选择装备'}</div>
              <div class="tm-jar-help">${state.currentItem ? escapeHtml(formatGrowthLevelText(state.currentItem)) : '请选择一件装备'}</div>
            </section>

            <section>
              <div class="tm-jar-section-title">锁定词缀</div>
              <div class="tm-jar-affix-list">${affixesHtml}</div>
            </section>
          </div>

          <div class="tm-jar-col">
            <section>
              <div class="tm-jar-section-row">
                <div class="tm-jar-section-title">停止规则</div>
                <button type="button" data-action="add-rule" ${state.running ? 'disabled' : ''}>新增规则</button>
              </div>
              <label>
                <span>规则关系</span>
                <select data-action="match-mode" ${state.running ? 'disabled' : ''}>
                  <option value="any" ${state.rulesMatchMode === 'any' ? 'selected' : ''}>任意一条满足即停</option>
                  <option value="all" ${state.rulesMatchMode === 'all' ? 'selected' : ''}>全部规则满足才停</option>
                </select>
              </label>
              <div class="tm-jar-help">${MATCH_MODE_TEXT[state.rulesMatchMode]}</div>
              ${hasUnconfiguredRule ? '<div class="tm-jar-help">未填写条件的启用规则不会参与停止判定。</div>' : ''}
              <div class="tm-jar-rules">${rulesHtml}</div>
            </section>

            <section>
              <div class="tm-jar-section-title">自动强化 / 精炼</div>
              <div class="tm-jar-grid">
                <label>
                  <span>强化目标 +</span>
                  <input type="number" min="1" max="${MAX_ENHANCE_TARGET_LEVEL}" data-action="target-enhance" value="${state.targetEnhanceLevel}" ${state.running ? 'disabled' : ''}/>
                </label>
                <label>
                  <span>精炼目标 +</span>
                  <input type="number" min="1" max="${MAX_REFINE_LEVEL}" data-action="target-refine" value="${state.targetRefineLevel}" ${state.running ? 'disabled' : ''}/>
                </label>
              </div>
              <div class="tm-jar-help">${escapeHtml(enhancePreviewText)}</div>
              <div class="tm-jar-help">${escapeHtml(refinePreviewText)}</div>
            </section>

            <section>
              <div class="tm-jar-section-title">执行设置</div>
              <div class="tm-jar-grid">
                <label>
                  <span>最小延时(ms)</span>
                  <input type="number" min="0" max="60000" data-action="delay-min" value="${state.delayMinMs}" ${state.running ? 'disabled' : ''}/>
                </label>
                <label>
                  <span>最大延时(ms)</span>
                  <input type="number" min="0" max="60000" data-action="delay-max" value="${state.delayMaxMs}" ${state.running ? 'disabled' : ''}/>
                </label>
                <label class="tm-jar-span-2">
                  <span>最大尝试次数</span>
                  <input type="number" min="1" max="100000" data-action="max-attempts" value="${state.maxAttempts}" ${state.running ? 'disabled' : ''}/>
                </label>
              </div>
            </section>

            <section>
              <div class="tm-jar-section-row tm-jar-action-row">
                <button type="button" class="primary" data-action="start-reroll" ${!canStartTask ? 'disabled' : ''}>开始自动洗练</button>
                <button type="button" data-action="start-enhance" ${!canStartTask ? 'disabled' : ''}>自动强化</button>
                <button type="button" data-action="start-refine" ${!canStartTask ? 'disabled' : ''}>自动精炼</button>
                <button type="button" data-action="stop" ${!state.running ? 'disabled' : ''}>停止</button>
              </div>
              <div class="tm-jar-status">
                <div>状态：${runningLabel}</div>
                <div>当前次数：${state.attempts}</div>
                <div>当前装备：${state.currentItem ? escapeHtml(formatGrowthLevelText(state.currentItem)) : '无'}</div>
                <div>最近结果：${escapeHtml(state.lastResultText || '无')}</div>
              </div>
            </section>
          </div>
        </div>

        <section>
          <div class="tm-jar-section-title">运行日志</div>
          <div class="tm-jar-log">${state.logs.map((line) => `<div>${escapeHtml(line)}</div>`).join('') || '<div class="tm-jar-empty">暂无日志</div>'}</div>
        </section>

        <section>
          <div class="tm-jar-section-title">调试信息</div>
          <div class="tm-jar-log">${state.debug.map((line) => `<div>${escapeHtml(line)}</div>`).join('') || '<div class="tm-jar-empty">暂无调试信息</div>'}</div>
        </section>
      </div>
    `;

    syncPanelVisibility();
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${OVERLAY_ID} {
        position: fixed;
        inset: 0;
        z-index: 999998;
        background: rgba(10, 10, 10, 0.42);
        display: none;
      }
      #${OVERLAY_ID}.is-open { display: block; }
      #${PANEL_ID} {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 999999;
        width: min(980px, calc(100vw - 16px));
        max-height: 88vh;
        overflow: auto;
        color: #1f1a14;
        background: rgba(250, 244, 233, 0.98);
        border: 1px solid #d4bd96;
        border-radius: 14px;
        box-shadow: 0 18px 40px rgba(0, 0, 0, 0.22);
        font: 14px/1.5 "Microsoft YaHei", "PingFang SC", sans-serif;
        display: none;
      }
      #${PANEL_ID}.is-open { display: block; }
      #${PANEL_ID} * { box-sizing: border-box; }
      #${ENTRY_ID} {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 56px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid rgba(188, 150, 98, 0.7);
        background: linear-gradient(180deg, rgba(250, 242, 223, 0.96), rgba(233, 213, 174, 0.96));
        color: #5b3b17;
        font: inherit;
        white-space: nowrap;
        cursor: pointer;
      }
      #${PANEL_ID} .tm-jar-header {
        padding: 12px 14px;
        font-weight: 700;
        background: linear-gradient(135deg, #efe0bf, #e6c998);
        border-bottom: 1px solid #d4bd96;
      }
      #${PANEL_ID} .tm-jar-toolbar,
      #${PANEL_ID} .tm-jar-body {
        padding: 10px 12px;
      }
      #${PANEL_ID} .tm-jar-layout {
        display: grid;
        grid-template-columns: minmax(280px, 0.9fr) minmax(420px, 1.3fr);
        gap: 10px;
      }
      #${PANEL_ID} .tm-jar-col {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      #${PANEL_ID} .tm-jar-toolbar {
        display: flex;
        gap: 8px;
      }
      #${PANEL_ID} section {
        margin-top: 10px;
        padding: 8px;
        border: 1px solid #e3d3b2;
        border-radius: 10px;
        background: rgba(255, 251, 244, 0.88);
      }
      #${PANEL_ID} .tm-jar-section-title {
        font-weight: 700;
        margin-bottom: 6px;
      }
      #${PANEL_ID} .tm-jar-section-row,
      #${PANEL_ID} .tm-jar-rule-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      #${PANEL_ID} .tm-jar-action-row {
        flex-wrap: wrap;
      }
      #${PANEL_ID} .tm-jar-inline {
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        gap: 4px;
        margin: 0;
      }
      #${PANEL_ID} label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 6px;
      }
      #${PANEL_ID} input,
      #${PANEL_ID} select,
      #${PANEL_ID} button {
        font: inherit;
      }
      #${PANEL_ID} input,
      #${PANEL_ID} select {
        width: 100%;
        padding: 5px 8px;
        border: 1px solid #c9b28a;
        border-radius: 8px;
        background: #fffdfa;
      }
      #${PANEL_ID} button {
        padding: 5px 10px;
        border: 1px solid #b99766;
        border-radius: 8px;
        background: #fffdf9;
        cursor: pointer;
      }
      #${PANEL_ID} button.primary {
        color: #fff;
        background: #9d5c18;
        border-color: #9d5c18;
      }
      #${PANEL_ID} button:disabled,
      #${PANEL_ID} input:disabled,
      #${PANEL_ID} select:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
      #${PANEL_ID} .tm-jar-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }
      #${PANEL_ID} .tm-jar-span-2 {
        grid-column: 1 / -1;
      }
      #${PANEL_ID} .tm-jar-current,
      #${PANEL_ID} .tm-jar-help,
      #${PANEL_ID} .tm-jar-status {
        margin-top: 6px;
        color: #6a5b46;
      }
      #${PANEL_ID} .tm-jar-affix-list,
      #${PANEL_ID} .tm-jar-log,
      #${PANEL_ID} .tm-jar-rules {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      #${PANEL_ID} .tm-jar-affix {
        flex-direction: row;
        align-items: center;
        gap: 6px;
        margin: 0;
        padding: 4px 6px;
        border-radius: 8px;
        background: #fffdfa;
        font-size: 12px;
        line-height: 1.3;
      }
      #${PANEL_ID} .tm-jar-affix-main {
        flex: 1;
        min-width: 0;
        font-size: 12px;
        line-height: 1.3;
      }
      #${PANEL_ID} .tm-jar-affix-meta {
        color: #7e6c56;
        white-space: nowrap;
        font-size: 11px;
        line-height: 1.2;
      }
      #${PANEL_ID} .tm-jar-rule {
        padding: 7px;
        border: 1px solid #eadbc0;
        border-radius: 10px;
        background: #fffdf9;
      }
      #${PANEL_ID} .tm-jar-empty {
        color: #8b7b66;
        padding: 6px 0;
      }
      #${PANEL_ID} .tm-jar-log {
        max-height: 120px;
        overflow: auto;
        font-size: 12px;
        line-height: 1.35;
      }
      #${PANEL_ID} .tm-jar-rule .tm-jar-grid label,
      #${PANEL_ID} .tm-jar-body label > span {
        font-size: 12px;
      }
      @media (max-width: 900px) {
        #${PANEL_ID} {
          width: calc(100vw - 16px);
          max-height: 72vh;
        }
        #${PANEL_ID} .tm-jar-layout {
          grid-template-columns: 1fr;
        }
        #${PANEL_ID} .tm-jar-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function syncPanelVisibility() {
    if (panelEl) panelEl.classList.toggle('is-open', !!state.open);
    if (overlayEl) overlayEl.classList.toggle('is-open', !!state.open);
  }

  function createPanel() {
    if (document.getElementById(PANEL_ID)) return;
    injectStyle();
    overlayEl = document.createElement('div');
    overlayEl.id = OVERLAY_ID;
    overlayEl.addEventListener('click', () => {
      state.open = false;
      persistState();
      syncPanelVisibility();
    });
    document.body.appendChild(overlayEl);

    panelEl = document.createElement('div');
    panelEl.id = PANEL_ID;
    panelEl.innerHTML = `<div class="tm-jar-header">九州自动洗练助手</div><div class="tm-jar-content"></div>`;
    contentEl = panelEl.querySelector('.tm-jar-content');
    panelEl.addEventListener('click', (event) => event.stopPropagation());
    panelEl.addEventListener('click', onPanelClick);
    panelEl.addEventListener('change', onPanelInput);
    panelEl.addEventListener('input', onPanelInput);
    document.body.appendChild(panelEl);
    syncPanelVisibility();
    render();
  }

  function getAnchorNodes() {
    return [...document.querySelectorAll('button,a,div,span')]
      .filter((node) => MENU_TEXTS.includes((node.textContent || '').trim()));
  }

  function findMenuContainer() {
    const anchors = getAnchorNodes();
    if (anchors.length === 0) return null;

    const scores = new Map();
    anchors.forEach((anchor) => {
      let parent = anchor.parentElement;
      let depth = 0;
      while (parent && depth < 5) {
        const hits = [...parent.children].filter((child) => MENU_TEXTS.includes((child.textContent || '').trim())).length;
        if (hits >= 2) {
          scores.set(parent, (scores.get(parent) || 0) + hits);
        }
        parent = parent.parentElement;
        depth += 1;
      }
    });

    let best = null;
    let bestScore = -1;
    for (const [node, score] of scores.entries()) {
      if (score > bestScore) {
        best = node;
        bestScore = score;
      }
    }
    return best;
  }

  function ensureEntryButton() {
    const parent = findMenuContainer();
    const existing = document.getElementById(ENTRY_ID);
    if (!parent) {
      if (existing) existing.remove();
      return;
    }
    if (existing && existing.parentElement === parent) return;
    if (existing) existing.remove();

    const button = document.createElement('button');
    button.id = ENTRY_ID;
    button.type = 'button';
    button.textContent = '洗练助手';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      state.open = !state.open;
      persistState();
      syncPanelVisibility();
      render();
    });
    parent.appendChild(button);
  }

  function startNavObserver() {
    if (navObserver) return;
    navObserver = new MutationObserver(() => {
      ensureEntryButton();
    });
    navObserver.observe(document.body, { childList: true, subtree: true });
    ensureEntryButton();
  }

  function onPanelInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.getAttribute('data-action');
    if (!action) return;

    if (action === 'item-select' && target instanceof HTMLSelectElement) {
      const itemId = Number(target.value);
      const item = state.inventory.find((row) => Number(row.id) === itemId);
      if (item) setCurrentItem(item);
      return;
    }
    if (action === 'match-mode' && target instanceof HTMLSelectElement) {
      state.rulesMatchMode = target.value === 'any' ? 'any' : 'all';
      persistState();
      render();
      return;
    }
    if (action === 'delay-min' && target instanceof HTMLInputElement) {
      state.delayMinMs = clamp(toInt(target.value, state.delayMinMs), 0, 60000);
      if (state.delayMaxMs < state.delayMinMs) state.delayMaxMs = state.delayMinMs;
      persistState();
      return;
    }
    if (action === 'delay-max' && target instanceof HTMLInputElement) {
      state.delayMaxMs = clamp(toInt(target.value, state.delayMaxMs), 0, 60000);
      if (state.delayMaxMs < state.delayMinMs) state.delayMinMs = state.delayMaxMs;
      persistState();
      return;
    }
    if (action === 'max-attempts' && target instanceof HTMLInputElement) {
      state.maxAttempts = clamp(toInt(target.value, state.maxAttempts), 1, 100000);
      persistState();
      return;
    }
    if (action === 'target-enhance' && target instanceof HTMLInputElement) {
      state.targetEnhanceLevel = clamp(toInt(target.value, state.targetEnhanceLevel), 1, MAX_ENHANCE_TARGET_LEVEL);
      persistState();
      return;
    }
    if (action === 'target-refine' && target instanceof HTMLInputElement) {
      state.targetRefineLevel = clamp(toInt(target.value, state.targetRefineLevel), 1, MAX_REFINE_LEVEL);
      persistState();
      return;
    }

    const ruleId = target.getAttribute('data-rule-id');
    if (!ruleId) return;
    if (action === 'toggle-rule' && target instanceof HTMLInputElement) {
      updateRule(ruleId, { enabled: target.checked });
      return;
    }
    if (action === 'rule-affix' && target instanceof HTMLSelectElement) {
      updateRule(ruleId, { affixKey: target.value });
      return;
    }
    if (action === 'rule-keyword' && target instanceof HTMLInputElement) {
      updateRule(ruleId, { nameKeyword: target.value });
      return;
    }
    if (action === 'rule-tier' && target instanceof HTMLInputElement) {
      updateRule(ruleId, { minTier: clamp(toInt(target.value, 0), 0, MAX_AFFIX_TIER) });
      return;
    }
    if (action === 'rule-roll' && target instanceof HTMLInputElement) {
      updateRule(ruleId, { minRollPercent: clamp(Number(target.value || 0) || 0, 0, 100) });
    }
  }

  function onPanelClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const node = target.closest('[data-action]');
    if (!(node instanceof HTMLElement)) return;
    const action = node.getAttribute('data-action');

    if (action === 'close') {
      state.open = false;
      persistState();
      syncPanelVisibility();
      return;
    }
    if (action === 'refresh') {
      void loadInventory();
      return;
    }
    if (action === 'add-rule') {
      addRule();
      return;
    }
    if (action === 'remove-rule') {
      removeRule(node.getAttribute('data-rule-id'));
      return;
    }
    if (action === 'start-reroll') {
      void startAutoReroll();
      return;
    }
    if (action === 'start-enhance') {
      void startAutoGrowth('enhance');
      return;
    }
    if (action === 'start-refine') {
      void startAutoGrowth('refine');
      return;
    }
    if (action === 'stop') {
      stopAutoTask();
      return;
    }
    if (action === 'toggle-lock') {
      const index = toInt(node.getAttribute('data-index'), -1);
      if (index < 0 || index >= state.currentAffixes.length) return;
      if (state.currentLockIndexes.includes(index)) {
        state.currentLockIndexes = state.currentLockIndexes.filter((value) => value !== index);
      } else {
        state.currentLockIndexes = [...state.currentLockIndexes, index].sort((a, b) => a - b);
      }
      persistState();
      render();
    }
  }

  async function boot() {
    loadState();
    ensureDefaultRule();
    createPanel();
    startNavObserver();
    await loadInventory();
  }

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('打开/关闭洗练助手', () => {
      state.open = !state.open;
      persistState();
      syncPanelVisibility();
      render();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void boot();
    }, { once: true });
  } else {
    void boot();
  }
})();
