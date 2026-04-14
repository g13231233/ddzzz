// ==UserScript==
// @name         九州修仙录-小伴侣
// @namespace    http://tampermonkey.net/
// @version      1.2.5
// @description  自动分解/自动使用/邮件自动领取
// @author       TravisWWW
// @match        https://jz.faith.wang/*
// @connect      *
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const K={CFG:'jz2_cfg',API:'jiuzhou_api_base',D:'jz2_d',U:'jz2_u',M:'jz2_m',MI:'jz2_mi',RUN:'jz2_running',IDLE_SPIRIT_TOTAL:'jz2_idle_spirit_total',IDLE_SESSION_ID:'jz2_idle_session_id',AD:'jz2_ad',SFD:'jz2_sect_fragment_done_date'};
    const T15=15000,T30=30000,T60=60000,T5=5000,T180=180000,MAX_LOG=50;
    const HOME_ICON=String.fromCodePoint(0x1F3E0);
    const IDLE_TOOLTIP_STYLE_ID='jz2_idle_tooltip_style';
    const AUTO_DUNGEON_MAX_ERROR_RETRY=3;
    const MAX_MAIL_BAG_RECOVER_RETRY=3;
    const TEAM_STAMINA_THRESHOLD=0;
    const AUTO_DUNGEON_START_STAMINA=100;
    const AUTO_DUNGEON_STOP_STAMINA=15;
    const REALMS=['凡人','炼精化炁·养气期','炼精化炁·通脉期','炼精化炁·凝炁期','炼炁化神·炼己期','炼炁化神·采药期','炼炁化神·结胎期','炼神返虚·养神期','炼神返虚·还虚期','炼神返虚·合道期','炼虚合道·证道期','炼虚合道·历劫期','炼虚合道·成圣期'];
    const QUALITY_IDS=['jz2_q_h','jz2_q_x','jz2_q_d','jz2_q_t'];
    const TASK_CATEGORIES=['main','side','daily','event'];
    const KEEP_KEYWORD_ROW_COUNT=3;
    const DEF={enableAutoDisassemble:false,enableAutoUse:false,enableAutoClaimMail:false,enableAutoSignIn:false,enableAutoMonthCard:false,enableAutoSectShopFragment:false,enableAutoWander:false,enableAutoDungeon:false,qualities:{黄:false,玄:false,地:false,天:false},keepSetOnly:false,keepRealmMin:'',keepAffixCountN:0,keepAffixTierMin:0,keepAffixAttrPercent:0,keepAffixSkillPercent:0,keepKeywordRows:Array.from({length:KEEP_KEYWORD_ROW_COUNT},()=>({name:'',affix:''})),autoDecomposeByNameEnabled:false,autoDecomposeNames:'',autoUsePresets:{lingshiBag:false,baoshiBag:false,giftBag:false},autoUseNames:'',autoDungeonSelection:'',enableLog:false,teamAutoTarget:''};

    /**
 * 静态资源/怪物/秘境快照
 * 数据来源 server/src/data/seeds 下的 map_def 与 dungeon_* 种子，可运行 scripts/tools/generate-jz2-companion-static-data.mjs 更新
 */
    const JZ2_STATIC_COMPANION_SNAPSHOT = JSON.parse(String.raw`{"generatedAt":"2026-03-20T20:48:03.982Z","gatherSpots":[{"mapId":"map-qingyun-village","mapName":"青云村","roomId":"room-elder-house","roomName":"村长宅邸","resourceId":"res-spirit-grass"},{"mapId":"map-qingyun-outskirts","mapName":"青云村外","roomId":"room-south-forest","roomName":"南林小道","resourceId":"res-wild-herb"},{"mapId":"map-qingyun-outskirts","mapName":"青云村外","roomId":"room-west-stream","roomName":"西溪边","resourceId":"mat-001"},{"mapId":"map-qingyun-outskirts","mapName":"青云村外","roomId":"room-rocky-area","roomName":"乱石岗","resourceId":"res-spirit-stone-ore"},{"mapId":"map-fallen-ruins","mapName":"断碑遗迹","roomId":"room-ruins-entrance","roomName":"遗迹入口","resourceId":"res-wild-herb"},{"mapId":"map-fallen-ruins","mapName":"断碑遗迹","roomId":"room-ruins-canyon","roomName":"断崖峡道","resourceId":"res-spirit-grass"},{"mapId":"map-howling-ridge","mapName":"啸风岭","roomId":"room-hanging-cliff","roomName":"悬崖窄道","resourceId":"res-spirit-stone-ore"},{"mapId":"map-withered-grove","mapName":"枯木幽林","roomId":"room-spore-marsh","roomName":"孢雾沼泽","resourceId":"res-spirit-grass"},{"mapId":"map-withered-grove","mapName":"枯木幽林","roomId":"room-ancient-stump","roomName":"古木残桩","resourceId":"res-spirit-stone-ore"},{"mapId":"map-yaowang-valley","mapName":"药王谷","roomId":"room-yaowang-herb-field","roomName":"药田","resourceId":"res-spirit-herb"},{"mapId":"map-yaowang-valley","mapName":"药王谷","roomId":"room-yaowang-herb-field","roomName":"药田","resourceId":"res-spirit-grass"},{"mapId":"map-yaowang-valley","mapName":"药王谷","roomId":"room-yaowang-spring","roomName":"灵泉池","resourceId":"mat-lianji-dan"},{"mapId":"map-yaowang-valley","mapName":"药王谷","roomId":"room-yaowang-cave","roomName":"药王洞","resourceId":"mat-xinmo-jinghua"},{"mapId":"map-youming-valley","mapName":"幽冥谷","roomId":"room-youming-marsh","roomName":"鬼火沼泽","resourceId":"mat-youming-gupi"},{"mapId":"map-youming-valley","mapName":"幽冥谷","roomId":"room-youming-underground-river","roomName":"地下暗河","resourceId":"mat-xinmo-jinghua"},{"mapId":"map-nanhai-coast","mapName":"南海岸","roomId":"room-nanhai-coral-beach","roomName":"珊瑚滩","resourceId":"mat-nanhai-lingzhu"},{"mapId":"map-nanhai-coast","mapName":"南海岸","roomId":"room-nanhai-mine-entrance","roomName":"灵脉矿洞入口","resourceId":"mat-lingmai-jingshi"},{"mapId":"map-nanhai-coast","mapName":"南海岸","roomId":"room-nanhai-deep-reef","roomName":"深海暗礁","resourceId":"mat-nanhai-lingzhu"},{"mapId":"map-nanhai-coast","mapName":"南海岸","roomId":"room-nanhai-dragon-bone","roomName":"龙骨残骸","resourceId":"mat-lingmai-jingshi"},{"mapId":"map-yanbing-rift","mapName":"炎冰裂谷","roomId":"room-yanbing-scorch-bank","roomName":"炎潮岸","resourceId":"mat-lingmai-jingshi"},{"mapId":"map-yanbing-rift","mapName":"炎冰裂谷","roomId":"room-yanbing-frost-ravine","roomName":"霜蚀沟","resourceId":"mat-xinmo-jinghua"},{"mapId":"map-yanbing-rift","mapName":"炎冰裂谷","roomId":"room-yanbing-crystal-shore","roomName":"晶滩","resourceId":"mat-nanhai-lingzhu"},{"mapId":"map-taixi-marsh","mapName":"胎息沼","roomId":"room-taixi-mudflat","roomName":"陷潮泥滩","resourceId":"mat-taiyuan-jingpo"},{"mapId":"map-taixi-marsh","mapName":"胎息沼","roomId":"room-taixi-alchemy-pad","roomName":"胎息炼药台","resourceId":"mat-jietai-dan"},{"mapId":"map-taixi-marsh","mapName":"胎息沼","roomId":"room-taixi-reed-maze","roomName":"芦雾迷阵","resourceId":"mat-taiyuan-jingpo"},{"mapId":"map-taixi-marsh","mapName":"胎息沼","roomId":"room-taixi-pool-gate","roomName":"宫阙外庭","resourceId":"mat-jiutai-jinghua"},{"mapId":"map-jiutai-sanctum","mapName":"九台宫阙","roomId":"room-jiutai-shadow-corridor","roomName":"影阙长廊","resourceId":"mat-jiutai-jinghua"},{"mapId":"map-jiutai-sanctum","mapName":"九台宫阙","roomId":"room-jiutai-core-hall","roomName":"中殿阵心","resourceId":"mat-jietai-dan"},{"mapId":"map-shenshi-wasteland","mapName":"神识荒原","roomId":"room-shenshi-void-rift","roomName":"虚空裂隙","resourceId":"mat-shenhun-ningjing"},{"mapId":"map-shenshi-wasteland","mapName":"神识荒原","roomId":"room-shenshi-soul-lake","roomName":"魂湖畔","resourceId":"mat-xuling-jinghua"},{"mapId":"map-shenshi-wasteland","mapName":"神识荒原","roomId":"room-shenshi-realm-peak","roomName":"意境之巅","resourceId":"mat-shenhun-ningjing"},{"mapId":"map-shenshi-wasteland","mapName":"神识荒原","roomId":"room-shenshi-temple-gate","roomName":"神殿门前","resourceId":"mat-yangshen-dan"},{"mapId":"map-huixu-rift","mapName":"还虚裂界","roomId":"room-huixu-fissure","roomName":"裂缝前沿","resourceId":"mat-xushi-jinghe"},{"mapId":"map-huixu-rift","mapName":"还虚裂界","roomId":"room-huixu-mirror","roomName":"蚀镜回廊","resourceId":"mat-xushi-jinghe"},{"mapId":"map-huixu-rift","mapName":"还虚裂界","roomId":"room-huixu-altar","roomName":"归流祭坛","resourceId":"mat-xushi-jinghe"},{"mapId":"map-huixu-rift","mapName":"还虚裂界","roomId":"room-huixu-tiantai-gate","roomName":"天台界门","resourceId":"mat-huanxu-dan"},{"mapId":"map-dadao-jingxu","mapName":"大道镜墟","roomId":"room-jingxu-zheguang","roomName":"折光外环","resourceId":"mat-daojing-xuansha"},{"mapId":"map-dadao-jingxu","mapName":"大道镜墟","roomId":"room-jingxu-zhaozui","roomName":"照罪长阶","resourceId":"mat-daojing-xuansha"},{"mapId":"map-dadao-jingxu","mapName":"大道镜墟","roomId":"room-jingxu-wendao","roomName":"问道悬庭","resourceId":"mat-daojing-xuansha"},{"mapId":"map-dadao-jingxu","mapName":"大道镜墟","roomId":"room-jingxu-sitian-gate","roomName":"司天宫门","resourceId":"mat-hedao-qiyin"}],"monsterSpots":[{"mapId":"map-qingyun-outskirts","mapName":"青云村外","roomId":"room-south-forest","roomName":"南林小道","monsterId":"monster-wild-rabbit","monsterName":"monster-wild-rabbit"},{"mapId":"map-qingyun-outskirts","mapName":"青云村外","roomId":"room-forest-clearing","roomName":"林中空地","monsterId":"monster-wild-rabbit","monsterName":"monster-wild-rabbit"},{"mapId":"map-qingyun-outskirts","mapName":"青云村外","roomId":"room-forest-clearing","roomName":"林中空地","monsterId":"monster-wild-boar","monsterName":"monster-wild-boar"},{"mapId":"map-qingyun-outskirts","mapName":"青云村外","roomId":"room-east-grassland","roomName":"东边草地","monsterId":"monster-wild-boar","monsterName":"monster-wild-boar"},{"mapId":"map-qingyun-outskirts","mapName":"青云村外","roomId":"room-east-grassland","roomName":"东边草地","monsterId":"monster-gray-wolf","monsterName":"monster-gray-wolf"},{"mapId":"map-qingyun-outskirts","mapName":"青云村外","roomId":"room-west-stream","roomName":"西溪边","monsterId":"monster-venomous-snake","monsterName":"monster-venomous-snake"},{"mapId":"map-qingyun-outskirts","mapName":"青云村外","roomId":"room-snake-nest","roomName":"蛇窟入口","monsterId":"monster-venomous-snake","monsterName":"monster-venomous-snake"},{"mapId":"map-qingyun-outskirts","mapName":"青云村外","roomId":"room-deep-forest","roomName":"密林深处","monsterId":"monster-gray-wolf","monsterName":"monster-gray-wolf"},{"mapId":"map-qingyun-outskirts","mapName":"青云村外","roomId":"room-deep-forest","roomName":"密林深处","monsterId":"monster-mountain-wolf","monsterName":"monster-mountain-wolf"},{"mapId":"map-qingyun-outskirts","mapName":"青云村外","roomId":"room-rocky-area","roomName":"乱石岗","monsterId":"monster-stone-golem","monsterName":"monster-stone-golem"},{"mapId":"map-qingyun-outskirts","mapName":"青云村外","roomId":"room-wolf-den","roomName":"狼窝","monsterId":"monster-mountain-wolf","monsterName":"monster-mountain-wolf"},{"mapId":"map-qingyun-outskirts","mapName":"青云村外","roomId":"room-wolf-den","roomName":"狼窝","monsterId":"monster-elite-wolf-king","monsterName":"monster-elite-wolf-king"},{"mapId":"map-fallen-ruins","mapName":"断碑遗迹","roomId":"room-ruins-entrance","roomName":"遗迹入口","monsterId":"monster-ruins-jackal","monsterName":"monster-ruins-jackal"},{"mapId":"map-fallen-ruins","mapName":"断碑遗迹","roomId":"room-broken-courtyard","roomName":"残破庭院","monsterId":"monster-shadow-viper","monsterName":"monster-shadow-viper"},{"mapId":"map-fallen-ruins","mapName":"断碑遗迹","roomId":"room-broken-courtyard","roomName":"残破庭院","monsterId":"monster-rune-golem","monsterName":"monster-rune-golem"},{"mapId":"map-fallen-ruins","mapName":"断碑遗迹","roomId":"room-collapsed-tower","roomName":"坍塌塔楼","monsterId":"monster-rune-golem","monsterName":"monster-rune-golem"},{"mapId":"map-fallen-ruins","mapName":"断碑遗迹","roomId":"room-stone-altar","roomName":"古祭坛","monsterId":"monster-gale-falcon","monsterName":"monster-gale-falcon"},{"mapId":"map-fallen-ruins","mapName":"断碑遗迹","roomId":"room-stone-altar","roomName":"古祭坛","monsterId":"monster-elite-storm-wolf","monsterName":"monster-elite-storm-wolf"},{"mapId":"map-fallen-ruins","mapName":"断碑遗迹","roomId":"room-ruins-canyon","roomName":"断崖峡道","monsterId":"monster-ruins-jackal","monsterName":"monster-ruins-jackal"},{"mapId":"map-howling-ridge","mapName":"啸风岭","roomId":"room-gale-trail","roomName":"风切小径","monsterId":"monster-ruins-jackal","monsterName":"monster-ruins-jackal"},{"mapId":"map-howling-ridge","mapName":"啸风岭","roomId":"room-gale-trail","roomName":"风切小径","monsterId":"monster-gale-falcon","monsterName":"monster-gale-falcon"},{"mapId":"map-howling-ridge","mapName":"啸风岭","roomId":"room-pine-slope","roomName":"松岭斜坡","monsterId":"monster-gale-falcon","monsterName":"monster-gale-falcon"},{"mapId":"map-howling-ridge","mapName":"啸风岭","roomId":"room-hanging-cliff","roomName":"悬崖窄道","monsterId":"monster-rune-golem","monsterName":"monster-rune-golem"},{"mapId":"map-howling-ridge","mapName":"啸风岭","roomId":"room-wolf-howl-pass","roomName":"狼啸隘口","monsterId":"monster-ruins-jackal","monsterName":"monster-ruins-jackal"},{"mapId":"map-howling-ridge","mapName":"啸风岭","roomId":"room-wolf-howl-pass","roomName":"狼啸隘口","monsterId":"monster-gale-falcon","monsterName":"monster-gale-falcon"},{"mapId":"map-howling-ridge","mapName":"啸风岭","roomId":"room-wind-throne","roomName":"风王台","monsterId":"monster-gale-falcon","monsterName":"monster-gale-falcon"},{"mapId":"map-howling-ridge","mapName":"啸风岭","roomId":"room-wind-throne","roomName":"风王台","monsterId":"monster-elite-storm-wolf","monsterName":"monster-elite-storm-wolf"},{"mapId":"map-withered-grove","mapName":"枯木幽林","roomId":"room-grove-edge","roomName":"幽林边缘","monsterId":"monster-shadow-viper","monsterName":"monster-shadow-viper"},{"mapId":"map-withered-grove","mapName":"枯木幽林","roomId":"room-decay-path","roomName":"腐叶古道","monsterId":"monster-ruins-jackal","monsterName":"monster-ruins-jackal"},{"mapId":"map-withered-grove","mapName":"枯木幽林","roomId":"room-decay-path","roomName":"腐叶古道","monsterId":"monster-rune-golem","monsterName":"monster-rune-golem"},{"mapId":"map-withered-grove","mapName":"枯木幽林","roomId":"room-spore-marsh","roomName":"孢雾沼泽","monsterId":"monster-shadow-viper","monsterName":"monster-shadow-viper"},{"mapId":"map-withered-grove","mapName":"枯木幽林","roomId":"room-root-maze","roomName":"盘根迷阵","monsterId":"monster-gale-falcon","monsterName":"monster-gale-falcon"},{"mapId":"map-withered-grove","mapName":"枯木幽林","roomId":"room-root-maze","roomName":"盘根迷阵","monsterId":"monster-rune-golem","monsterName":"monster-rune-golem"},{"mapId":"map-withered-grove","mapName":"枯木幽林","roomId":"room-dead-lake","roomName":"寂水死湖","monsterId":"monster-shadow-viper","monsterName":"monster-shadow-viper"},{"mapId":"map-withered-grove","mapName":"枯木幽林","roomId":"room-dead-lake","roomName":"寂水死湖","monsterId":"monster-gale-falcon","monsterName":"monster-gale-falcon"},{"mapId":"map-withered-grove","mapName":"枯木幽林","roomId":"room-ancient-stump","roomName":"古木残桩","monsterId":"monster-rune-golem","monsterName":"monster-rune-golem"},{"mapId":"map-withered-grove","mapName":"枯木幽林","roomId":"room-withered-heart","roomName":"枯心祭场","monsterId":"monster-elite-storm-wolf","monsterName":"monster-elite-storm-wolf"},{"mapId":"map-yaowang-valley","mapName":"药王谷","roomId":"room-yaowang-valley-entrance","roomName":"谷口","monsterId":"monster-duzhang-guchong","monsterName":"monster-duzhang-guchong"},{"mapId":"map-yaowang-valley","mapName":"药王谷","roomId":"room-yaowang-herb-field","roomName":"药田","monsterId":"monster-duzhang-guchong","monsterName":"monster-duzhang-guchong"},{"mapId":"map-yaowang-valley","mapName":"药王谷","roomId":"room-yaowang-herb-field","roomName":"药田","monsterId":"monster-xinmo-huanying","monsterName":"monster-xinmo-huanying"},{"mapId":"map-yaowang-valley","mapName":"药王谷","roomId":"room-yaowang-spring","roomName":"灵泉池","monsterId":"monster-duzhang-guchong","monsterName":"monster-duzhang-guchong"},{"mapId":"map-yaowang-valley","mapName":"药王谷","roomId":"room-yaowang-spring","roomName":"灵泉池","monsterId":"monster-youming-guizu","monsterName":"monster-youming-guizu"},{"mapId":"map-yaowang-valley","mapName":"药王谷","roomId":"room-yaowang-deep-garden","roomName":"药圃深处","monsterId":"monster-xinmo-huanying","monsterName":"monster-xinmo-huanying"},{"mapId":"map-yaowang-valley","mapName":"药王谷","roomId":"room-yaowang-deep-garden","roomName":"药圃深处","monsterId":"monster-duzhang-guchong","monsterName":"monster-duzhang-guchong"},{"mapId":"map-yaowang-valley","mapName":"药王谷","roomId":"room-yaowang-cave","roomName":"药王洞","monsterId":"monster-xinmo-huanying","monsterName":"monster-xinmo-huanying"},{"mapId":"map-yaowang-valley","mapName":"药王谷","roomId":"room-yaowang-cave","roomName":"药王洞","monsterId":"monster-elite-youming-jiangjun","monsterName":"monster-elite-youming-jiangjun"},{"mapId":"map-youming-valley","mapName":"幽冥谷","roomId":"room-youming-stone-steps","roomName":"谷口石阶","monsterId":"monster-youming-guizu","monsterName":"monster-youming-guizu"},{"mapId":"map-youming-valley","mapName":"幽冥谷","roomId":"room-youming-wind-path","roomName":"阴风栈道","monsterId":"monster-youming-guizu","monsterName":"monster-youming-guizu"},{"mapId":"map-youming-valley","mapName":"幽冥谷","roomId":"room-youming-wind-path","roomName":"阴风栈道","monsterId":"monster-xinmo-huanying","monsterName":"monster-xinmo-huanying"},{"mapId":"map-youming-valley","mapName":"幽冥谷","roomId":"room-youming-marsh","roomName":"鬼火沼泽","monsterId":"monster-duzhang-guchong","monsterName":"monster-duzhang-guchong"},{"mapId":"map-youming-valley","mapName":"幽冥谷","roomId":"room-youming-marsh","roomName":"鬼火沼泽","monsterId":"monster-youming-guizu","monsterName":"monster-youming-guizu"},{"mapId":"map-youming-valley","mapName":"幽冥谷","roomId":"room-youming-underground-river","roomName":"地下暗河","monsterId":"monster-youming-guizu","monsterName":"monster-youming-guizu"},{"mapId":"map-youming-valley","mapName":"幽冥谷","roomId":"room-youming-underground-river","roomName":"地下暗河","monsterId":"monster-elite-youming-jiangjun","monsterName":"monster-elite-youming-jiangjun"},{"mapId":"map-nanhai-coast","mapName":"南海岸","roomId":"room-nanhai-coral-beach","roomName":"珊瑚滩","monsterId":"monster-nanhai-haijiao","monsterName":"monster-nanhai-haijiao"},{"mapId":"map-nanhai-coast","mapName":"南海岸","roomId":"room-nanhai-deep-reef","roomName":"深海暗礁","monsterId":"monster-nanhai-haijiao","monsterName":"monster-nanhai-haijiao"},{"mapId":"map-nanhai-coast","mapName":"南海岸","roomId":"room-nanhai-deep-reef","roomName":"深海暗礁","monsterId":"monster-lingmai-shimo","monsterName":"monster-lingmai-shimo"},{"mapId":"map-nanhai-coast","mapName":"南海岸","roomId":"room-nanhai-dragon-bone","roomName":"龙骨残骸","monsterId":"monster-lingmai-jingkuangshou","monsterName":"monster-lingmai-jingkuangshou"},{"mapId":"map-nanhai-coast","mapName":"南海岸","roomId":"room-nanhai-dragon-bone","roomName":"龙骨残骸","monsterId":"monster-elite-lingmai-jingshou","monsterName":"monster-elite-lingmai-jingshou"},{"mapId":"map-nanhai-coast","mapName":"南海岸","roomId":"room-nanhai-island-pier","roomName":"仙岛码头","monsterId":"monster-nanhai-haijiao","monsterName":"monster-nanhai-haijiao"},{"mapId":"map-nanhai-coast","mapName":"南海岸","roomId":"room-nanhai-island-pier","roomName":"仙岛码头","monsterId":"monster-elite-lingmai-jingshou","monsterName":"monster-elite-lingmai-jingshou"},{"mapId":"map-yanbing-rift","mapName":"炎冰裂谷","roomId":"room-yanbing-scorch-bank","roomName":"炎潮岸","monsterId":"monster-yanshuang-rongchao-yao","monsterName":"monster-yanshuang-rongchao-yao"},{"mapId":"map-yanbing-rift","mapName":"炎冰裂谷","roomId":"room-yanbing-scorch-bank","roomName":"炎潮岸","monsterId":"monster-yanshuang-jingjia-shou","monsterName":"monster-yanshuang-jingjia-shou"},{"mapId":"map-yanbing-rift","mapName":"炎冰裂谷","roomId":"room-yanbing-frost-ravine","roomName":"霜蚀沟","monsterId":"monster-yanshuang-hanwu-guzu","monsterName":"monster-yanshuang-hanwu-guzu"},{"mapId":"map-yanbing-rift","mapName":"炎冰裂谷","roomId":"room-yanbing-frost-ravine","roomName":"霜蚀沟","monsterId":"monster-yanshuang-mojing-huanying","monsterName":"monster-yanshuang-mojing-huanying"},{"mapId":"map-yanbing-rift","mapName":"炎冰裂谷","roomId":"room-yanbing-dualcore-crossing","roomName":"双核交汇","monsterId":"monster-yanshuang-jingjia-shou","monsterName":"monster-yanshuang-jingjia-shou"},{"mapId":"map-yanbing-rift","mapName":"炎冰裂谷","roomId":"room-yanbing-dualcore-crossing","roomName":"双核交汇","monsterId":"monster-yanshuang-rongchao-yao","monsterName":"monster-yanshuang-rongchao-yao"},{"mapId":"map-yanbing-rift","mapName":"炎冰裂谷","roomId":"room-yanbing-dualcore-crossing","roomName":"双核交汇","monsterId":"monster-elite-yanshuang-shuangsha-jiang","monsterName":"monster-elite-yanshuang-shuangsha-jiang"},{"mapId":"map-yanbing-rift","mapName":"炎冰裂谷","roomId":"room-yanbing-crystal-shore","roomName":"晶滩","monsterId":"monster-yanshuang-jingjia-shou","monsterName":"monster-yanshuang-jingjia-shou"},{"mapId":"map-yanbing-rift","mapName":"炎冰裂谷","roomId":"room-yanbing-crystal-shore","roomName":"晶滩","monsterId":"monster-elite-yanshuang-rongjing-jushou","monsterName":"monster-elite-yanshuang-rongjing-jushou"},{"mapId":"map-taixi-marsh","mapName":"胎息沼","roomId":"room-taixi-mudflat","roomName":"陷潮泥滩","monsterId":"monster-taixi-mire-lurker","monsterName":"monster-taixi-mire-lurker"},{"mapId":"map-taixi-marsh","mapName":"胎息沼","roomId":"room-taixi-mudflat","roomName":"陷潮泥滩","monsterId":"monster-taixi-swamp-serpent","monsterName":"monster-taixi-swamp-serpent"},{"mapId":"map-taixi-marsh","mapName":"胎息沼","roomId":"room-taixi-reed-maze","roomName":"芦雾迷阵","monsterId":"monster-taixi-herb-wraith","monsterName":"monster-taixi-herb-wraith"},{"mapId":"map-taixi-marsh","mapName":"胎息沼","roomId":"room-taixi-reed-maze","roomName":"芦雾迷阵","monsterId":"monster-jiutai-shadow-disciple","monsterName":"monster-jiutai-shadow-disciple"},{"mapId":"map-jiutai-sanctum","mapName":"九台宫阙","roomId":"room-jiutai-shadow-corridor","roomName":"影阙长廊","monsterId":"monster-jiutai-shadow-disciple","monsterName":"monster-jiutai-shadow-disciple"},{"mapId":"map-jiutai-sanctum","mapName":"九台宫阙","roomId":"room-jiutai-shadow-corridor","roomName":"影阙长廊","monsterId":"monster-jietai-xuanmu-puppet","monsterName":"monster-jietai-xuanmu-puppet"},{"mapId":"map-shenshi-wasteland","mapName":"神识荒原","roomId":"room-shenshi-void-rift","roomName":"虚空裂隙","monsterId":"monster-yangshen-void-phantom","monsterName":"monster-yangshen-void-phantom"},{"mapId":"map-shenshi-wasteland","mapName":"神识荒原","roomId":"room-shenshi-void-rift","roomName":"虚空裂隙","monsterId":"monster-yangshen-soul-wisp","monsterName":"monster-yangshen-soul-wisp"},{"mapId":"map-shenshi-wasteland","mapName":"神识荒原","roomId":"room-shenshi-soul-lake","roomName":"魂湖畔","monsterId":"monster-yangshen-soul-wisp","monsterName":"monster-yangshen-soul-wisp"},{"mapId":"map-shenshi-wasteland","mapName":"神识荒原","roomId":"room-shenshi-soul-lake","roomName":"魂湖畔","monsterId":"monster-yangshen-void-phantom","monsterName":"monster-yangshen-void-phantom"},{"mapId":"map-shenshi-wasteland","mapName":"神识荒原","roomId":"room-shenshi-realm-peak","roomName":"意境之巅","monsterId":"monster-elite-yangshen-realm-warden","monsterName":"monster-elite-yangshen-realm-warden"},{"mapId":"map-shenshi-wasteland","mapName":"神识荒原","roomId":"room-shenshi-realm-peak","roomName":"意境之巅","monsterId":"monster-elite-yangshen-void-marshal","monsterName":"monster-elite-yangshen-void-marshal"},{"mapId":"map-huixu-rift","mapName":"还虚裂界","roomId":"room-huixu-fissure","roomName":"裂缝前沿","monsterId":"monster-huanxu-rift-blade","monsterName":"monster-huanxu-rift-blade"},{"mapId":"map-huixu-rift","mapName":"还虚裂界","roomId":"room-huixu-fissure","roomName":"裂缝前沿","monsterId":"monster-huanxu-xushi-wisp","monsterName":"monster-huanxu-xushi-wisp"},{"mapId":"map-huixu-rift","mapName":"还虚裂界","roomId":"room-huixu-mirror","roomName":"蚀镜回廊","monsterId":"monster-huanxu-xushi-wisp","monsterName":"monster-huanxu-xushi-wisp"},{"mapId":"map-huixu-rift","mapName":"还虚裂界","roomId":"room-huixu-mirror","roomName":"蚀镜回廊","monsterId":"monster-huanxu-rift-blade","monsterName":"monster-huanxu-rift-blade"},{"mapId":"map-huixu-rift","mapName":"还虚裂界","roomId":"room-huixu-altar","roomName":"归流祭坛","monsterId":"monster-elite-huanxu-mark-warden","monsterName":"monster-elite-huanxu-mark-warden"},{"mapId":"map-huixu-rift","mapName":"还虚裂界","roomId":"room-huixu-altar","roomName":"归流祭坛","monsterId":"monster-elite-huanxu-null-priest","monsterName":"monster-elite-huanxu-null-priest"},{"mapId":"map-dadao-jingxu","mapName":"大道镜墟","roomId":"room-jingxu-zheguang","roomName":"折光外环","monsterId":"monster-hedao-jingjia-guard","monsterName":"monster-hedao-jingjia-guard"},{"mapId":"map-dadao-jingxu","mapName":"大道镜墟","roomId":"room-jingxu-zheguang","roomName":"折光外环","monsterId":"monster-hedao-zheguang-lingguan","monsterName":"monster-hedao-zheguang-lingguan"},{"mapId":"map-dadao-jingxu","mapName":"大道镜墟","roomId":"room-jingxu-zhaozui","roomName":"照罪长阶","monsterId":"monster-hedao-jingjia-guard","monsterName":"monster-hedao-jingjia-guard"},{"mapId":"map-dadao-jingxu","mapName":"大道镜墟","roomId":"room-jingxu-zhaozui","roomName":"照罪长阶","monsterId":"monster-elite-hedao-beishi-xunling","monsterName":"monster-elite-hedao-beishi-xunling"},{"mapId":"map-dadao-jingxu","mapName":"大道镜墟","roomId":"room-jingxu-wendao","roomName":"问道悬庭","monsterId":"monster-hedao-zheguang-lingguan","monsterName":"monster-hedao-zheguang-lingguan"},{"mapId":"map-dadao-jingxu","mapName":"大道镜墟","roomId":"room-jingxu-wendao","roomName":"问道悬庭","monsterId":"monster-elite-hedao-jingyu-sipan","monsterName":"monster-elite-hedao-jingyu-sipan"}],"dungeonOptions":[{"value":"dungeon-qiqi-wolf-den@@2","label":"苍狼巢穴(困难)"},{"value":"dungeon-qiqi-wolf-den@@1","label":"苍狼巢穴(普通)"},{"value":"dungeon-qiqi-storm-rift@@2","label":"风裂峡谷(困难)"},{"value":"dungeon-qiqi-storm-rift@@1","label":"风裂峡谷(普通)"},{"value":"dungeon-lianshen-huixu-tiantai@@3","label":"还虚天台(噩梦)"},{"value":"dungeon-lianshen-huixu-tiantai@@2","label":"还虚天台(困难)"},{"value":"dungeon-lianshen-huixu-tiantai@@1","label":"还虚天台(普通)"},{"value":"dungeon-qiqi-frost-abyss@@2","label":"寒渊裂隙(困难)"},{"value":"dungeon-qiqi-frost-abyss@@1","label":"寒渊裂隙(普通)"},{"value":"dungeon-lianqi-jiutai-gongque@@3","label":"九台宫阙(噩梦)"},{"value":"dungeon-lianqi-jiutai-gongque@@2","label":"九台宫阙(困难)"},{"value":"dungeon-lianqi-jiutai-gongque@@1","label":"九台宫阙(普通)"},{"value":"dungeon-qiqi-withered-altar@@2","label":"枯藤祭坛(困难)"},{"value":"dungeon-qiqi-withered-altar@@1","label":"枯藤祭坛(普通)"},{"value":"dungeon-lianqi-lingmai-kuangyuan@@3","label":"灵脉矿渊(噩梦)"},{"value":"dungeon-lianqi-lingmai-kuangyuan@@2","label":"灵脉矿渊(困难)"},{"value":"dungeon-lianqi-lingmai-kuangyuan@@1","label":"灵脉矿渊(普通)"},{"value":"dungeon-qiqi-stone-mine@@2","label":"石窟矿洞(困难)"},{"value":"dungeon-qiqi-stone-mine@@1","label":"石窟矿洞(普通)"},{"value":"dungeon-lianqi-xinmo-huanjing@@3","label":"心魔幻境(噩梦)"},{"value":"dungeon-lianqi-xinmo-huanjing@@2","label":"心魔幻境(困难)"},{"value":"dungeon-lianqi-xinmo-huanjing@@1","label":"心魔幻境(普通)"},{"value":"dungeon-lianshen-xuling-shendian@@3","label":"虚灵神殿(噩梦)"},{"value":"dungeon-lianshen-xuling-shendian@@2","label":"虚灵神殿(困难)"},{"value":"dungeon-lianshen-xuling-shendian@@1","label":"虚灵神殿(普通)"},{"value":"dungeon-lianshen-xuanjian-sitian-gong@@3","label":"玄鉴司天宫(噩梦)"},{"value":"dungeon-lianshen-xuanjian-sitian-gong@@2","label":"玄鉴司天宫(困难)"},{"value":"dungeon-lianshen-xuanjian-sitian-gong@@1","label":"玄鉴司天宫(普通)"},{"value":"dungeon-lianqi-xuanmu-shentai@@3","label":"玄母神台(噩梦)"},{"value":"dungeon-lianqi-xuanmu-shentai@@2","label":"玄母神台(困难)"},{"value":"dungeon-lianqi-xuanmu-shentai@@1","label":"玄母神台(普通)"},{
  "value": "dungeon-lianxu-wanfa-daogong@@1",
  "label": "万法道宫(普通)"
},
{
  "value": "dungeon-lianxu-wanfa-daogong@@2",
  "label": "万法道宫(困难)"
},
{
  "value": "dungeon-lianxu-wanfa-daogong@@3",
  "label": "万法道宫(噩梦)"
},{"value":"dungeon-lianqi-yanshuang-lieyuan@@2","label":"炎霜裂渊(困难)"},{"value":"dungeon-lianqi-yanshuang-lieyuan@@1","label":"炎霜裂渊(普通)"}]}`);
    const STATIC_GATHER_SPOTS = JZ2_STATIC_COMPANION_SNAPSHOT.gatherSpots;
    const STATIC_MONSTER_SPOTS = JZ2_STATIC_COMPANION_SNAPSHOT.monsterSpots;
    const STATIC_DUNGEON_OPTIONS = JZ2_STATIC_COMPANION_SNAPSHOT.dungeonOptions;

    const store={
        get:(k,f=null)=>{try{const v=localStorage.getItem(k);return v==null?f:v;}catch{return f;}},
        set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}},
        gj:(k,f)=>{try{const r=localStorage.getItem(k);return r?JSON.parse(r):f;}catch{return f;}},
        sj:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}}
    };

    const UI={logs:[],logPanelVisible:false,statusHistory:[]};
    const cfg=()=>{const c={...DEF,...(store.gj(K.CFG,null)||{})};c.qualities=c.qualities||{黄:false,玄:false,地:false,天:false};c.autoUsePresets=c.autoUsePresets||{lingshiBag:false,baoshiBag:false,giftBag:false};c.keepKeywordRows=normalizeKeywordRows(c.keepKeywordRows,c.keepNameKeywords,c.keepExcludeKeywords);return c;};
    const save=(c)=>store.sj(K.CFG,c);
    const i=(v,d=0)=>{const n=parseInt(String(v),10);return Number.isFinite(n)?n:d;};
    const f=(v,d=0)=>{const n=parseFloat(String(v));return Number.isFinite(n)?n:d;};
    /**
 * 归一化 3 行关键词配置，兼容旧版的独立字段。
 * @param {Array<{name:string,affix:string}>|null} rows
 * @param {string} fallbackName
 * @param {string} fallbackAffix
 * @returns {Array<{name:string,affix:string}>}
 */
    function normalizeKeywordRows(rows,fallbackName='',fallbackAffix=''){
        const normalized=Array.from({length:KEEP_KEYWORD_ROW_COUNT},()=>({name:'',affix:''}));
        if(Array.isArray(rows)){
            rows.slice(0,KEEP_KEYWORD_ROW_COUNT).forEach((row,idx)=>{
                normalized[idx]={name:String(row?.name||'').trim(),affix:String(row?.affix||'').trim()};
            });
        }
        if(!normalized.some(row=>row.name||row.affix)){
            const legacyName=String(fallbackName||'').trim();
            const legacyAffix=String(fallbackAffix||'').trim();
            if(legacyName||legacyAffix)normalized[0]={name:legacyName,affix:legacyAffix};
        }
        return normalized;
    }
    const cnt=(k)=>i(store.get(k,'0'),0),add=(k,d)=>store.set(k,String(cnt(k)+(Number.isFinite(d)?d:0))),rst=(k)=>store.set(k,'0');

    function now(){const d=new Date();const p=(n)=>String(n).padStart(2,'0');return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;}
    function renderLogs(){const el=document.getElementById('jz2_log_view');if(!el)return;const stick=el.scrollHeight-el.scrollTop-el.clientHeight<20;el.textContent=UI.logs.join('\n');if(stick)el.scrollTop=el.scrollHeight;}
    function log(level,msg,detail){const line=`[${now()}] [${level}] ${msg}${detail?` | ${detail}`:''}`;UI.logs.push(line);if(UI.logs.length>MAX_LOG)UI.logs=UI.logs.slice(UI.logs.length-MAX_LOG);if(cfg().enableLog){if(level==='ERROR')console.error('[小伴侣]',msg,detail||'');else console.log('[小伴侣]',msg,detail||'');}renderLogs();}

    class Queue{constructor(){this.t=Promise.resolve();this.p=0;}en(label,fn){this.p++;const run=async()=>{try{return await fn();}finally{this.p=Math.max(0,this.p-1);}};const p=this.t.then(run,run);this.t=p.catch(()=>{});log('DEBUG',`队列入列:${label}`,`pending=${this.p}`);return p;}}

    let apiBase=null;
    let idleSpiritTotal=i(store.get(K.IDLE_SPIRIT_TOTAL,'0'),0);
    let idleSessionId=String(store.get(K.IDLE_SESSION_ID,'')||'').trim();
    let idleTrackingActive=!!idleSessionId;
    let idleSessionStartedAtMs=0;
    let idleBattleTotal=0;
    let idleExpTotal=0;
    let idleSilverTotal=0;
    let idleSessionSnapshotReady=false;
    let idleObservedLastBattle=-1;
    let idleObservedLastElapsedHours=-1;
    let idleRawLogSig='';
    let idleCalcLogSig='';
    let idleStatusSyncAtMs=0;
    let idleStatusSyncPromise=null;
    let idleTooltipHovering=false;
    let dungeonOptionsCache=[];
    const getApi=()=>apiBase||store.get(K.API,null)||`${location.protocol}//${location.hostname}:6011/api`;
    const saveApi=(b)=>{apiBase=b;store.set(K.API,b);};


    function formatIdleLogTime(ms){
        if(!(Number.isFinite(ms)&&ms>0))return '0';
        try{return new Date(ms).toLocaleString('zh-CN',{hour12:false});}catch{return String(ms);}
    }
    function applyIdleSessionSnapshot(session,fallback={}){
        idleBattleTotal=Math.max(0,Math.floor(Number(session?.totalBattles??session?.battleCount??0)||0));
        idleExpTotal=Math.max(0,Math.floor(Number(session?.totalExp??session?.expTotal??0)||0));
        idleSilverTotal=Math.max(0,Math.floor(Number(session?.totalSilver??session?.silverTotal??0)||0));
        const hasSessionData=!!session;
        idleSessionSnapshotReady=hasSessionData;
        const sid=String(session?.id??fallback?.sessionId??fallback?.existingSessionId??'').trim();
        const startAtRaw=session?.startedAt??session?.startAt??fallback?.startedAt??fallback?.startAt;
        const startAtMs=Date.parse(String(startAtRaw||''));
        if(Number.isFinite(startAtMs)&&startAtMs>0) idleSessionStartedAtMs=startAtMs;
        if(!sid&&!hasSessionData){idleTrackingActive=false;setIdleSessionId('');resetIdleSessionSnapshot();idleSessionStartedAtMs=0;logIdleRawSnapshot('status-empty',`sessionId=-; hasSessionData=false`);renderIdleSpiritTooltip(idleTooltipHovering);return;}
        logIdleRawSnapshot('status',`sessionId=${sid||'-'}; hasSessionData=${hasSessionData}; startAtRaw=${String(startAtRaw||'')||'-'}`);
        if(!sid&&hasSessionData){idleTrackingActive=true;renderIdleSpiritTooltip(idleTooltipHovering);return;}
        if(!idleSessionId){setIdleSessionId(sid);idleTrackingActive=true;renderIdleSpiritTooltip(idleTooltipHovering);return;}
        if(idleSessionId!==sid){resetIdleSpirit();setIdleSessionId(sid);}
        idleTrackingActive=true;
        renderIdleSpiritTooltip(idleTooltipHovering);
    }
    function logIdleRawSnapshot(scene,extra=''){
        const detail=`scene=${scene}; startedAt=${formatIdleLogTime(idleSessionStartedAtMs)}; startedAtMs=${idleSessionStartedAtMs||0}; battleTotal=${idleBattleTotal}; expTotal=${idleExpTotal}; silverTotal=${idleSilverTotal}${extra?`; ${extra}`:''}`;
        const sig=`${scene}|${idleSessionStartedAtMs||0}|${idleBattleTotal}|${idleExpTotal}|${idleSilverTotal}|${extra}`;
        if(sig===idleRawLogSig)return;
        idleRawLogSig=sig;
        log('INFO','挂机原始数据',detail);
    }
    function logIdleCalcSnapshot(hours,totals){
        const battleAvg=hours>0&&totals.battle>0?(totals.battle/hours):0;
        const expAvg=hours>0&&totals.exp>0?(totals.exp/hours):0;
        const silverAvg=hours>0&&totals.silver>0?(totals.silver/hours):0;
        const detail=`hours=${hours.toFixed(6)}; startedAt=${formatIdleLogTime(idleSessionStartedAtMs)}; battleTotal=${totals.battle}; expTotal=${totals.exp}; silverTotal=${totals.silver}; battleAvg=${battleAvg.toFixed(2)}/h; expAvg=${expAvg.toFixed(2)}/h; silverAvg=${silverAvg.toFixed(2)}/h`;
        const sig=`${hours.toFixed(0)}|${totals.battle}|${totals.exp}|${totals.silver}|${battleAvg.toFixed(2)}|${expAvg.toFixed(2)}|${silverAvg.toFixed(2)}`;
        if(sig===idleCalcLogSig)return;
        idleCalcLogSig=sig;
        log('INFO','挂机平均值计算',detail);
    }

    function hookNet(){
        const xo=XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open=function(m,u,...a){try{this.__jz2ReqUrl=String(u||'');if(typeof u==='string'&&u.includes('/api/')){const mm=u.match(/(https?:\/\/[^/]+\/api)/);if(mm)saveApi(mm[1]);}}catch{}return xo.apply(this,[m,u,...a]);};
        const xs=XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send=function(...a){this.addEventListener('loadend',()=>{try{const url=String(this.__jz2ReqUrl||'');if(!url.includes('/api/idle/start')&&!url.includes('/api/idle/status'))return;const payload=JSON.parse(String(this.responseText||'{}'));consumeIdleSessionPayload(url,payload);}catch{}});return xs.apply(this,a);};
        const of=window.fetch;
        window.fetch=async function(u,...a){try{if(typeof u==='string'&&u.includes('/api/')){const mm=u.match(/(https?:\/\/[^/]+\/api)/);if(mm)saveApi(mm[1]);}}catch{}const resp=await of.apply(this,[u,...a]);try{const url=String(typeof u==='string'?u:(u&&u.url)||'');if(url.includes('/api/idle/start')||url.includes('/api/idle/status')){const cloned=resp.clone();cloned.json().then((payload)=>consumeIdleSessionPayload(url,payload)).catch(()=>{});}}catch{}return resp;};
    }

    const token=()=>store.get('token',null);
    function gm(url,opt={}){return new Promise((res,rej)=>GM_xmlhttpRequest({method:opt.method||'GET',url,headers:opt.headers||{},data:opt.body,timeout:15000,onload:r=>{try{res(JSON.parse(r.responseText));}catch{rej(new Error('解析响应失败'));}},onerror:()=>rej(new Error('网络请求失败')),ontimeout:()=>rej(new Error('请求超时'))}));}
    async function get(path){const t=token();if(!t)throw new Error('未登录');const b=getApi();const r=await gm(`${b}${path}`,{headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json'}});if(!r.success)throw new Error(r.message||'请求失败');saveApi(b);return r.data;}
    async function post(path,body){const t=token();if(!t)throw new Error('未登录');const b=getApi();const r=await gm(`${b}${path}`,{method:'POST',headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json'},body:JSON.stringify(body||{})});if(!r.success)throw new Error(r.message||'请求失败');saveApi(b);return r;}

    const inv=async()=>{const d=await get('/inventory/items?location=bag&page=1&pageSize=200');return Array.isArray(d?.items)?d.items:[];};
    /**
 * 获取背包快照。
 * @param {Array<object>|null} presetItems 允许透传已经获取好的背包数据，避免重复请求。
 * @returns {Promise<Array<object>>}
 */
    async function getBagItemsSnapshot(presetItems=null){return Array.isArray(presetItems)?presetItems:await inv();}
    const disBatch=(items)=>post('/inventory/disassemble/batch',{items});
    const use=(itemInstanceId,qty)=>post('/inventory/use',{itemInstanceId,qty});
    function spiritGainFromUseResponse(resp){const rows=Array.isArray(resp?.data?.lootResults)?resp.data.lootResults:(Array.isArray(resp?.lootResults)?resp.lootResults:[]);let gain=0;for(const row of rows){const tp=String(row?.type||'').trim().toLowerCase();if(tp!=='spirit_stones'&&tp!=='spiritstones')continue;const amount=Number(row?.amount??row?.qty);if(!Number.isFinite(amount)||amount<=0)continue;gain+=Math.floor(amount);}return gain;}

    function isIdleTrackingRunning(){return !!document.querySelector('.idle-status-indicator');}
    function persistIdleSpirit(){store.set(K.IDLE_SPIRIT_TOTAL,String(Math.max(0,i(idleSpiritTotal,0))));}
    function setIdleSessionId(v){idleSessionId=String(v||'').trim();store.set(K.IDLE_SESSION_ID,idleSessionId);}
    function resetIdleSpirit(){idleSpiritTotal=0;persistIdleSpirit();}
    function resetIdleSessionSnapshot(){idleBattleTotal=0;idleExpTotal=0;idleSilverTotal=0;idleSessionSnapshotReady=false;}
    function addIdleSpirit(delta){const gain=Math.max(0,Math.floor(Number(delta)||0));if(gain<=0)return;idleSpiritTotal+=gain;persistIdleSpirit();markIdleTooltipRefreshPending();}
    function ensureIdleTooltipLayoutStyle(){
        if(document.getElementById(IDLE_TOOLTIP_STYLE_ID))return;
        const style=document.createElement('style');
        style.id=IDLE_TOOLTIP_STYLE_ID;
        style.textContent=`
.idle-status-tooltip.jz2-idle-tooltip{
  width:100%;
  max-width:none;
}
.idle-status-tooltip.jz2-idle-tooltip .idle-status-tooltip-row{
  display:grid;
  grid-template-columns:1fr 1fr;
  column-gap:8px;
  align-items:center;
  min-height:22px;
}
.idle-status-tooltip.jz2-idle-tooltip .idle-status-tooltip-row > span:first-child{
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.idle-status-tooltip.jz2-idle-tooltip .idle-status-tooltip-row > span:nth-child(2){
  min-width:0;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  text-align:right;
}
`;
        document.head.appendChild(style);
    }
    function consumeIdleSessionPayload(url,payload){
        if(url.includes('/api/idle/start')){
            if(payload&&payload.success===false)return;
            const sid=String(payload?.data?.sessionId||payload?.data?.existingSessionId||'').trim();
            resetIdleSessionSnapshot();
            idleSessionStartedAtMs=Date.now();
            const startAtRaw=payload?.data?.startedAt??payload?.data?.startAt??payload?.data?.session?.startedAt??payload?.data?.session?.startAt;
            const startAtMs=Date.parse(String(startAtRaw||''));
            if(Number.isFinite(startAtMs)&&startAtMs>0) idleSessionStartedAtMs=startAtMs;
            resetIdleSpirit();
            idleTrackingActive=true;
            if(sid)setIdleSessionId(sid);
            logIdleRawSnapshot('start',`sessionId=${sid||'-'}; startAtRaw=${String(startAtRaw||'')||'-'}`);
            renderIdleSpiritTooltip(idleTooltipHovering);
            void syncIdleSessionStatus(true);
            return;
        }
        if(!url.includes('/api/idle/status'))return;
        applyIdleSessionSnapshot(payload?.data?.session||payload?.data||null,payload?.data||{});
    }
    function ensureIdleSpiritTooltipRow(tooltip){
        if(!(tooltip instanceof HTMLElement))return null;
        const baseRows=Array.from(tooltip.querySelectorAll('.idle-status-tooltip-row:not(.jz2-idle-spirit-row)'))
        .filter((row)=>row instanceof HTMLElement);
        const anchorRow=baseRows.length?baseRows[baseRows.length-1]:null;
        if(!(anchorRow instanceof HTMLElement))return null;
        let row=tooltip.querySelector('.jz2-idle-spirit-row');
        if(!(row instanceof HTMLElement)){
            row=document.createElement('div');
            row.className='idle-status-tooltip-row jz2-idle-spirit-row';
            row.innerHTML='<span>\u7d2f\u8ba1\u7075\u77f3</span><span>+0</span>';
            anchorRow.insertAdjacentElement('afterend',row);
        }else if(row.previousElementSibling!==anchorRow){
            anchorRow.insertAdjacentElement('afterend',row);
        }
        return row;
    }
    function parseIntSafeText(text){
        const n=parseInt(String(text||'').replace(/[^\d]/g,''),10);
        return Number.isFinite(n)?n:0;
    }
    function parseFirstIntText(text){
        const m=String(text||'').match(/\d+/);
        if(!m)return 0;
        const n=parseInt(m[0],10);
        return Number.isFinite(n)?n:0;
    }
    function parseDurationHoursFromText(text){
        const raw=String(text||'').trim();
        if(!raw)return 0;
        let h=0,m=0,s=0;
        const hMatch=raw.match(/(\d+)\s*(?:h|小时|hr|hour)/i);
        const mMatch=raw.match(/(\d+)\s*(?:m|分|min|minute)/i);
        const sMatch=raw.match(/(\d+)\s*(?:s|秒|sec|second)/i);
        if(hMatch)h=parseIntSafeText(hMatch[1]);
        if(mMatch)m=parseIntSafeText(mMatch[1]);
        if(sMatch)s=parseIntSafeText(sMatch[1]);
        if(!hMatch&&!mMatch&&!sMatch){
            const nums=(raw.match(/\d+/g)||[]).map((v)=>parseIntSafeText(v));
            if(nums.length===3){h=nums[0];m=nums[1];s=nums[2];}
            else if(nums.length===2){m=nums[0];s=nums[1];}
            else if(nums.length===1){s=nums[0];}
        }
        return h+(m/60)+(s/3600);
    }
    function parseIdleElapsedHours(){return idleSessionStartedAtMs>0?Math.max(0,Date.now()-idleSessionStartedAtMs)/3600000:0;}
    function formatAvgCompact(value,hours){
        if(!(value>0)||!(hours>0))return '0.00/h';
        const perHour=Math.max(0,Number(value)/Number(hours));
        if(perHour>=1e9)return `${(perHour/1e9).toFixed(2)}b/h`;
        if(perHour>=1e6)return `${(perHour/1e6).toFixed(2)}m/h`;
        if(perHour>=1e3)return `${(perHour/1e3).toFixed(2)}k/h`;
        return `${perHour.toFixed(2)}/h`;
    }
    function setRowLabelWithAvg(row,total,hours){
        if(!(row instanceof HTMLElement))return;
        const labelNode=row.querySelector(':scope > span:first-child');
        if(!(labelNode instanceof HTMLElement))return;
        const baseLabel=String(labelNode.dataset.jzBaseLabel||labelNode.textContent||'').replace(/\s*\([^)]*\)\s*$/,'').trim();
        if(!baseLabel)return;
        labelNode.dataset.jzBaseLabel=baseLabel;
        labelNode.textContent=`${baseLabel} (${formatAvgCompact(total,hours)})`;
    }
    function extractIdleTotalsFromTooltip(){
        return {
            battle:Math.max(0,idleBattleTotal),
            exp:Math.max(0,idleExpTotal),
            silver:Math.max(0,idleSilverTotal)
        };
    }
    function getIdleMetricRows(tooltip){
        if(!(tooltip instanceof HTMLElement))return{battleRow:null,expRow:null,silverRow:null,spiritRow:null};
        const rows=Array.from(tooltip.querySelectorAll('.idle-status-tooltip-row'));
        return{
            battleRow:rows[3] instanceof HTMLElement?rows[3]:null,
            expRow:rows[4] instanceof HTMLElement?rows[4]:null,
            silverRow:rows[5] instanceof HTMLElement?rows[5]:null,
            spiritRow:rows[6] instanceof HTMLElement?rows[6]:null
        };
    }
    function syncIdleSessionByObservedTotals(hours,battle){
        if(!(hours>=0)||!(battle>=0))return;
        const hasPrev=idleObservedLastBattle>=0&&idleObservedLastElapsedHours>=0;
        if(hasPrev){
            const elapsedBack=hours+1/3600<idleObservedLastElapsedHours;
            const battleBack=battle<idleObservedLastBattle;
            if(elapsedBack||battleBack){
                resetIdleSpirit();
                idleSessionStartedAtMs=hours>0?Date.now()-Math.floor(hours*3600000):Date.now();
            }
        }
        idleObservedLastBattle=battle;
        idleObservedLastElapsedHours=hours;
    }
    async function syncIdleSessionStatus(force=false){
        if(!token())return;
        if(idleStatusSyncPromise)return idleStatusSyncPromise;
        if(!force&&Date.now()-idleStatusSyncAtMs<T5&&idleSessionSnapshotReady)return;
        idleStatusSyncPromise=(async()=>{
            try{
                const data=await get('/idle/status');
                idleStatusSyncAtMs=Date.now();
                applyIdleSessionSnapshot(data?.session??data??null,data||{});
            }catch(e){
                log('DEBUG','挂机状态同步失败',e?.message||String(e));
            }finally{
                idleStatusSyncPromise=null;
            }
        })();
        return idleStatusSyncPromise;
    }
    function applyIdleRatePreview(tooltip){
        if(!(tooltip instanceof HTMLElement))return;
        ensureIdleTooltipLayoutStyle();
        const antInner=tooltip.parentElement;
        if(antInner instanceof HTMLElement && antInner.classList.contains('ant-tooltip-inner')){
            antInner.style.maxWidth='none';
            antInner.style.width='420px';
        }
        const antRoot=antInner?.closest('.ant-tooltip');
        if(antRoot instanceof HTMLElement){
            antRoot.style.maxWidth='none';
        }
        const hours=parseIdleElapsedHours();
        tooltip.classList.add('jz2-idle-tooltip');
        const {battleRow,expRow,silverRow,spiritRow}=getIdleMetricRows(tooltip);
        const totals=extractIdleTotalsFromTooltip();
        syncIdleSessionByObservedTotals(hours,totals.battle);
        logIdleCalcSnapshot(hours,totals);
        if(battleRow instanceof HTMLElement){
            setRowLabelWithAvg(battleRow,totals.battle,hours);
        }
        if(expRow instanceof HTMLElement){
            setRowLabelWithAvg(expRow,totals.exp,hours);
        }
        if(silverRow instanceof HTMLElement){
            setRowLabelWithAvg(silverRow,totals.silver,hours);
        }
        if(spiritRow instanceof HTMLElement){
            setRowLabelWithAvg(spiritRow,Math.max(0,i(idleSpiritTotal,0)),hours);
        }
    }
    function renderIdleSpiritTooltip(force=false){
        if(!force&&!idleTooltipHovering)return;
        if(!isIdleTrackingRunning()){document.querySelectorAll('.jz2-idle-spirit-row').forEach((n)=>n.remove());return;}
        void syncIdleSessionStatus(force);
        const tooltips=Array.from(document.querySelectorAll('.idle-status-tooltip'));
        for(const tooltip of tooltips){
            if(!(tooltip instanceof HTMLElement))continue;
            const row=ensureIdleSpiritTooltipRow(tooltip);
            if(!(row instanceof HTMLElement))continue;
            const value=row.querySelector(':scope > span:nth-child(2)');
            if(value instanceof HTMLElement)value.textContent=`+${Math.max(0,i(idleSpiritTotal,0)).toLocaleString()}`;
            applyIdleRatePreview(tooltip);
        }
    }
    async function renderIdleSpiritTooltipAfterStatus(force=false){
        await syncIdleSessionStatus(force);
        renderIdleSpiritTooltip(force||idleTooltipHovering);
    }
    let idleTooltipRefreshPending=false;
    /** 标记挂机关联 tooltip 需要刷新，避免在高频场景立刻重算平均值。 */
    function markIdleTooltipRefreshPending(){idleTooltipRefreshPending=true;}
    /** 将积累的 tooltip 刷新一次性执行，用于礼盒开启等批量操作完成后。 */
    function flushIdleTooltipRefresh(){if(!idleTooltipRefreshPending)return;idleTooltipRefreshPending=false;renderIdleSpiritTooltipAfterStatus(true);}
    const mails=(p=1,s=100)=>get(`/mail/list?page=${p}&pageSize=${s}`);
    const claim=(mailId)=>post('/mail/claim',{mailId});
    const deleteMailById=(mailId)=>post('/mail/delete',{mailId});
    const signInOverview=async(month='')=>await get(`/signin/overview${month?`?month=${encodeURIComponent(month)}`:''}`);
    const doSignInAction=()=>post('/signin/do',{});
    const claimMonthCardRewardAction=(monthCardId='')=>post('/monthcard/claim',monthCardId?{monthCardId}:{});
    const SECT_SHOP_LIST_PATH='/sect/shop';
    const SECT_SHOP_BUY_PATH='/sect/shop/buy';
    const SECT_DONATE_PATH='/sect/donate';
    const WANDER_OVERVIEW_PATH='/wander/overview';
    const WANDER_GENERATE_PATH='/wander/generate';
    const WANDER_CHOOSE_PATH='/wander/choose';
    const SECT_FRAGMENT_SHOP_ITEM_ID='sect-shop-005';
    const SECT_FRAGMENT_DAILY_BUY_QTY=500;
    const SECT_FRAGMENT_DONATE_AMOUNT=10000;
    function todayDateKey(){
        const now=new Date();
        const p=(n)=>String(n).padStart(2,'0');
        return `${now.getFullYear()}-${p(now.getMonth()+1)}-${p(now.getDate())}`;
    }
    function nextDailyResetDelayMs(offsetMinutes=1){
        const now=new Date();
        const next=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,0,offsetMinutes,0,0);
        return Math.max(T5,next.getTime()-now.getTime());
    }
    function getSectFragmentDoneDate(){return String(store.get(K.SFD,'')||'').trim();}
    function setSectFragmentDoneDate(v){const value=String(v||'').trim();store.set(K.SFD,value);ST.lastSectShopActionDate=value;}
    function isSectContributionInsufficientError(msg){return /贡献不足|宗门贡献|contribution/i.test(String(msg||''));}
    function isSectFragmentAlreadyHandled(msg){return /已购买|已兑换|限购|今日最多|售罄|卖完/i.test(String(msg||''));}
    function collectObjectArrays(value,rows=[]){
        if(Array.isArray(value)){rows.push(value);return rows;}
        if(value&&typeof value==='object'){
            for(const child of Object.values(value)) collectObjectArrays(child,rows);
        }
        return rows;
    }
    function extractSectShopItemName(row){
        return String(row?.name||row?.itemName||row?.goodsName||row?.title||row?.item?.name||row?.itemDef?.name||row?.reward?.name||row?.productName||'').trim();
    }
    function normalizeSectShopItems(payload){
        const arrays=collectObjectArrays(payload,[]);
        const seen=new Set();
        const rows=[];
        for(const arr of arrays){
            for(const row of arr){
                if(!row||typeof row!=='object')continue;
                const name=extractSectShopItemName(row);
                const id=String(row?.itemId??row?.id??row?.shopItemId??row?.goodsId??row?.productId??'').trim();
                if(!id&&!name)continue;
                const key=`${id}|${name}`;
                if(seen.has(key))continue;
                seen.add(key);
                rows.push({raw:row,id,name});
            }
        }
        return rows;
    }
    function findSectFragmentItem(items){
        const list=Array.isArray(items)?items:[];
        const byId=list.find((item)=>String(item?.id||'').trim()===SECT_FRAGMENT_SHOP_ITEM_ID);
        if(byId)return byId;
        return list.find((item)=>/功法.*残页|残页.*功法|功法残页/i.test(String(item?.name||'')));
    }
    async function loadSectShopItems(){
        const data=await get(SECT_SHOP_LIST_PATH);
        return normalizeSectShopItems(data);
    }
    function buildSectShopBuyBodies(item){
        const quantity=SECT_FRAGMENT_DAILY_BUY_QTY;
        const candidateIds=[
            String(item?.id||'').trim(),
            String(item?.raw?.id||'').trim(),
            String(item?.raw?.itemId||'').trim(),
            String(item?.raw?.shopItemId||'').trim(),
            SECT_FRAGMENT_SHOP_ITEM_ID
        ].filter(Boolean);
        const uniqIds=Array.from(new Set(candidateIds));
        return uniqIds.map((id)=>({itemId:id,quantity}));
    }
    async function buySectShopItem(item){
        let lastErr=null;
        for(const body of buildSectShopBuyBodies(item)){
            try{return await post(SECT_SHOP_BUY_PATH,body);}catch(e){lastErr=e;}
        }
        throw lastErr||new Error('sect shop buy failed');
    }
    async function donateSectContribution(amount=SECT_FRAGMENT_DONATE_AMOUNT){
        return await post(SECT_DONATE_PATH,{spiritStones:amount});
    }
    async function settleSectShopFragmentPurchase(source='sect-fragment-auto'){
        const today=todayDateKey();
        if(getSectFragmentDoneDate()===today)return{purchased:false,skipped:true,reason:'today-done'};
        setStatus('宗门残页：加载商店列表...');
        const items=await loadSectShopItems();
        const target=findSectFragmentItem(items);
        if(!target)return{purchased:false,skipped:false,error:'未找到功法残页商品'};
        setStatus(`宗门残页：尝试购买 ${target.name||target.id} x${SECT_FRAGMENT_DAILY_BUY_QTY}...`);
        try{
            await buySectShopItem(target);
            setSectFragmentDoneDate(today);
            return{purchased:true,donated:false,itemName:target.name||target.id,count:SECT_FRAGMENT_DAILY_BUY_QTY};
        }catch(e){
            const msg=String(e?.message||e||'').trim();
            if(isSectFragmentAlreadyHandled(msg)){
                setSectFragmentDoneDate(today);
                return{purchased:false,skipped:true,reason:msg||'already-handled'};
            }
            if(!isSectContributionInsufficientError(msg))throw e;
        }
        setStatus(`宗门残页：贡献不足，先捐献${SECT_FRAGMENT_DONATE_AMOUNT}灵石...`);
        await donateSectContribution(SECT_FRAGMENT_DONATE_AMOUNT);
        setStatus(`宗门残页：捐献完成，重试购买 ${target.name||target.id} x${SECT_FRAGMENT_DAILY_BUY_QTY}...`);
        try{
            await buySectShopItem(target);
            setSectFragmentDoneDate(today);
            return{purchased:true,donated:true,itemName:target.name||target.id,count:SECT_FRAGMENT_DAILY_BUY_QTY,donationAmount:SECT_FRAGMENT_DONATE_AMOUNT};
        }catch(e){
            const msg=String(e?.message||e||'').trim();
            if(isSectFragmentAlreadyHandled(msg)){
                setSectFragmentDoneDate(today);
                return{purchased:false,skipped:true,reason:msg||'already-handled'};
            }
            throw e;
        }
    }
    const inventoryCraftRecipes=async(recipeType='')=>await get(`/inventory/craft/recipes${recipeType?`?recipeType=${encodeURIComponent(recipeType)}`:''}`);
    const executeInventoryCraftRecipe=(recipeId,times)=>post('/inventory/craft/execute',{recipeId,times});
    const updateCharacterPosition=(currentMapId,currentRoomId)=>post('/character/updatePosition',{currentMapId,currentRoomId});
    const characterInfo=()=>get('/character/info');
    const startBattle=(monsterIds)=>post('/battle/start',{monsterIds});
    const battleState=async(battleId)=>await get(`/battle/state/${enc(battleId)}`);
    const abandonBattle=(battleId)=>post('/battle/abandon',{battleId});
    const dungeonList=async()=>{const d=await get('/dungeon/list');return Array.isArray(d?.dungeons)?d.dungeons:[];};
    const dungeonPreview=async(dungeonId,rank)=>await get(`/dungeon/preview/${enc(dungeonId)}?rank=${enc(rank)}`);
    const createDungeonInstance=(dungeonId,difficultyRank)=>post('/dungeon/instance/create',{dungeonId,difficultyRank});
    const startDungeonInstance=(instanceId)=>post('/dungeon/instance/start',{instanceId});
    const nextDungeonInstance=(instanceId)=>post('/dungeon/instance/next',{instanceId});
    const getDungeonInstance=(instanceId)=>get(`/dungeon/instance/${enc(instanceId)}`);
    const startDungeonBattleSession=(instanceId)=>post('/battle-session/start',{type:'dungeon',instanceId});
    const advanceBattleSession=(sessionId)=>post(`/battle-session/${enc(sessionId)}/advance`,{});
    const getBattleSession=(sessionId)=>get(`/battle-session/${enc(sessionId)}`);
    const getBattleSessionByBattleId=(battleId)=>get(`/battle-session/by-battle/${enc(battleId)}`);
    const getCurrentBattleSession=()=>get('/battle-session/current');
    const enc=(v)=>encodeURIComponent(String(v||'').trim());
    const mapList=async()=>{const d=await get('/map/maps');return Array.isArray(d?.maps)?d.maps:[];};
    const mapDetail=async(mapId)=>await get(`/map/${enc(mapId)}`);
    const roomObjects=async(mapId,roomId)=>{const d=await get(`/map/${enc(mapId)}/rooms/${enc(roomId)}/objects`);return Array.isArray(d?.objects)?d.objects:[];};
    const gatherResource=(mapId,roomId,resourceId)=>post(`/map/${enc(mapId)}/rooms/${enc(roomId)}/resources/${enc(resourceId)}/gather`,{});
    const taskOverview=async(category)=>{const d=await get(`/task/overview?category=${enc(category)}`);return Array.isArray(d?.tasks)?d.tasks:[];};
    const submitTaskToNpc=async(npcId,taskId)=>post('/task/npc/submit',{npcId,taskId});
    const claimTaskReward=async(taskId)=>post('/task/claim',{taskId});

    const rIdx=(realm)=>realm?REALMS.indexOf(String(realm).trim()):-1;
    function affixes(it){if(Array.isArray(it.affixes))return it.affixes;return [];}
    function socketedGemEntries(raw){if(Array.isArray(raw))return raw.filter(Boolean);if(typeof raw==='string'){try{const parsed=JSON.parse(raw);return Array.isArray(parsed)?parsed.filter(Boolean):[];}catch{return[];}}if(raw&&typeof raw==='object'){if(Array.isArray(raw.entries))return raw.entries.filter(Boolean);if(Array.isArray(raw.list))return raw.list.filter(Boolean);}return[];}
    function countSocketedGems(raw){return socketedGemEntries(raw).length;}
    function normEq(it){const d=it?.def||{};const sid=d?.set_id??it?.set_id??it?.setId??null;const strengthenLevel=Math.max(0,i(it?.strengthen_level??it?.strengthenLevel,0));const refineLevel=Math.max(0,i(it?.refine_level??it?.refineLevel,0));const socketedGemCount=Math.max(0,countSocketedGems(it?.socketed_gems??it?.socketedGems));return{id:i(it?.id,0),qty:Math.max(1,i(it?.qty,1)),name:String(d?.name||it?.name||''),quality:String(it?.quality||d?.quality||''),category:String(d?.category||it?.category||''),location:String(it?.location||'bag'),locked:!!it?.locked,equipReqRealm:String(d?.equip_req_realm||it?.equip_req_realm||''),setId:sid==null?'':String(sid),affixes:affixes(it),strengthenLevel,refineLevel,socketedGemCount};}
    function shouldProtectEquipment(e){if(!e)return false;const strengthen=Math.max(0,i(e.strengthenLevel,0));const refine=Math.max(0,i(e.refineLevel,0));const gems=Math.max(0,i(e.socketedGemCount,0));return strengthen>0||refine>0||gems>0;}
    function affixHit(aff,attrT,skillT){let c=0;for(const a of(Array.isArray(aff)?aff:[])){const rp=Number(a?.roll_percent);if(!Number.isFinite(rp))continue;const tp=String(a?.apply_type||'').toLowerCase();if(tp==='special'){if(rp>=skillT)c++;}else if(rp>=attrT)c++;}return c;}
    function qualifiedAffixTexts(e,c){const out=[];const attrT=f(c.keepAffixAttrPercent,0),skillT=f(c.keepAffixSkillPercent,0),tierMin=Math.max(0,i(c.keepAffixTierMin,0));for(const a of(Array.isArray(e.affixes)?e.affixes:[])){const tier=i(a?.tier,-1);if(tier<tierMin)continue;const rp=Number(a?.roll_percent);if(!Number.isFinite(rp))continue;const tp=String(a?.apply_type||'').toLowerCase();const pass=tp==='special'?rp>=skillT:rp>=attrT;if(!pass)continue;out.push(String(a?.name||''));}return out;}
    function keywordHitCount(text,ps){const n=String(text||''),lo=n.toLowerCase();let hit=0;for(const p of ps){const q=String(p||'').trim();if(!q)continue;let ok=false;if(lo.includes(q.toLowerCase()))ok=true;else{try{ok=new RegExp(q,'i').test(n);}catch{ok=false;}}if(ok)hit++;}return hit;}
    /** 判断一行词条关键词是否满足命中阈值，命中数量受 keepAffixCountN 限制。 */
    function affixKeywordsSatisfied(qTexts,ps,c){if(!Array.isArray(ps)||!ps.length)return true;const ss=Array.isArray(qTexts)?qTexts:[];if(!ss.length)return false;const all=ss.join('\n');const affixHit=keywordHitCount(all,ps);const need=Math.max(0,i(c.keepAffixCountN,0));const target=need>0?Math.min(need,ps.length):ps.length;return affixHit>=target;}
    /** 单行关键词判断：名称命中后，按词条关键词与阈值决定是否保留。 */
    function keywordRowMatchesEquipment(row,e,c,qTexts){const namePs=pats(row?.name||'');if(!namePs.length)return false;if(keywordHitCount(String(e?.name||''),namePs)<=0)return false;const affixPs=pats(row?.affix||'');return affixKeywordsSatisfied(qTexts,affixPs,c);}
    function keepTian(e,c){
        if(e.quality!=='天')return false;
        if(c.keepSetOnly){const s=String(e.setId||'').toLowerCase();if(!s||s==='none'||s==='null')return false;}
        if(c.keepRealmMin){const need=rIdx(c.keepRealmMin),got=rIdx(e.equipReqRealm);if(need>=0&&got<need)return false;}
        const qTexts=qualifiedAffixTexts(e,c);
        const n=Math.max(0,i(c.keepAffixCountN,0));
        if(n>0&&qTexts.length<n)return false;
        const rows=Array.isArray(c.keepKeywordRows)?c.keepKeywordRows:[];
        const activeRows=rows.filter(row=>pats(row?.name||'').length>0);
        if(!activeRows.length)return true;
        for(const row of activeRows){
            if(keywordRowMatchesEquipment(row,e,c,qTexts))return true;
        }
        return false;
    }
    function pats(t){const s=String(t||'').trim();if(!s)return[];return Array.from(new Set(s.split(/[\n,，]/).map(x=>x.trim()).filter(Boolean)));}
    function mName(name,ps){const n=String(name||''),lo=n.toLowerCase();return ps.some(p=>{const q=String(p||'').trim();if(!q)return false;if(lo.includes(q.toLowerCase()))return true;try{return new RegExp(q,'i').test(n);}catch{return false;}});}
    function mNameAll(name,ps){const n=String(name||''),lo=n.toLowerCase();return ps.every(p=>{const q=String(p||'').trim();if(!q)return false;if(lo.includes(q.toLowerCase()))return true;try{return new RegExp(q,'i').test(n);}catch{return false;}});}
    function usePats(c){const o=[];if(c.autoUsePresets?.lingshiBag)o.push('灵石袋');if(c.autoUsePresets?.baoshiBag)o.push('宝石袋');if(c.autoUsePresets?.giftBag)o.push('礼包');for(const p of pats(c.autoUseNames))o.push(p);return Array.from(new Set(o));}

    async function doDis(c,bagItems=null){const items=await getBagItemsSnapshot(bagItems);const eqs=items.map(normEq).filter(x=>x.category==='equipment');const eqMap=new Map(eqs.map(e=>[e.id,e]));const qsel=new Set(Object.entries(c.qualities||{}).filter(([,e])=>!!e).map(([q])=>q));const t=[];if(qsel.size>0){for(const e of eqs){if(e.locked||e.location!=='bag'||!qsel.has(e.quality))continue;if(shouldProtectEquipment(e))continue;if(e.quality==='天'&&keepTian(e,c))continue;t.push({itemId:e.id,qty:e.qty});}}
                                          if(c.autoDecomposeByNameEnabled){const ps=pats(c.autoDecomposeNames);if(ps.length){for(const it of items){if(it?.locked||String(it?.location||'bag')!=='bag')continue;const name=String(it?.def?.name||it?.name||'');if(!mName(name,ps))continue;const id=i(it?.id,0);if(id<=0)continue;const eqInfo=eqMap.get(id);if(eqInfo&&shouldProtectEquipment(eqInfo))continue;t.push({itemId:id,qty:Math.max(1,i(it?.qty,1))});}}}
                                          const mp=new Map();for(const x of t){if(!Number.isInteger(x.itemId)||x.itemId<=0)continue;if(!mp.has(x.itemId))mp.set(x.itemId,x);}const payload=Array.from(mp.values());if(!payload.length)return{success:true,count:0};const r=await disBatch(payload);const c2=Number(r.disassembledCount||payload.length)||payload.length;add(K.D,c2);log('INFO','自动分解完成',`count=${c2}`);return{success:true,count:c2};}

    async function doUse(c,bagItems=null){const ps=usePats(c);if(!ps.length)return{success:true,count:0};const items=await getBagItemsSnapshot(bagItems);let used=0;for(const it of items){if(it?.locked||String(it?.location||'bag')!=='bag')continue;const name=String(it?.def?.name||it?.name||'');if(!mName(name,ps))continue;const id=i(it?.id,0),q=Math.max(1,i(it?.qty,1));if(id<=0)continue;try{const resp=await use(id,q);used+=q;const gain=spiritGainFromUseResponse(resp);if(gain>0&&(idleTrackingActive||isIdleTrackingRunning()))addIdleSpirit(gain);}catch(e){log('ERROR','自动使用单项失败',e?.message||String(e));}}
                                          if(used>0)add(K.U,used);log('INFO','自动使用完成',`count=${used}`);flushIdleTooltipRefresh();return{success:true,count:used};}

    /**
 * 邮件附件统一快照。
 * 作用：把新字段 attachRewards 与旧字段（attachItems/银两/灵石）统一成单一数组，供邮件巡检/统计复用，避免重复判定逻辑。
 * 输入/输出：输入为后端 /mail/list 返回的单封邮件；输出为 GrantedRewardResult 风格的数组，仅包含有效附件行。
 * 数据流：getMailSnapshot -> mailCycle/canDeleteMail -> 本函数 -> hasAttach/countMailItemRewards -> 邮件领取/删除决策。
 * 关键边界条件：
 * 1. 若 attachRewards 已提供，则直接使用，防止重复解析导致字段错配；
 * 2. 旧字段兜底时仅在数量>0、物品ID有效时写入，避免把空附件误判为可领取。
 */
    function getMailRewardEntries(mail){
        if(!mail)return[];
        if(Array.isArray(mail.attachRewards)&&mail.attachRewards.length>0){
            return mail.attachRewards.filter((reward)=>reward&&typeof reward==='object');
        }
        const rewards=[];
        const silver=Math.max(0,i(mail?.attachSilver,0));
        if(silver>0)rewards.push({type:'silver',amount:silver});
        const spiritStones=Math.max(0,i(mail?.attachSpiritStones,0));
        if(spiritStones>0)rewards.push({type:'spirit_stones',amount:spiritStones});
        if(Array.isArray(mail?.attachItems)){
            for(const item of mail.attachItems){
                const qty=Math.max(0,i(item?.qty??item?.quantity,0));
                if(qty<=0)continue;
                const itemDefId=String(item?.item_def_id||item?.itemDefId||'').trim();
                if(!itemDefId)continue;
                const itemName=String(item?.item_name||item?.itemName||'').trim();
                rewards.push({type:'item',itemDefId,quantity:qty,itemName:itemName||undefined});
            }
        }
        return rewards;
    }
    function hasAttach(m){return getMailRewardEntries(m).length>0;}
    function countMailItemRewards(mail){return getMailRewardEntries(mail).reduce((sum,reward)=>{if(!reward||typeof reward!=='object')return sum;const type=String(reward.type||'').toLowerCase();if(type!=='item')return sum;return sum+Math.max(0,i(reward.quantity??reward.qty,0));},0);}
    function canDeleteMail(mail){if(!mail)return false;const claimed=!!mail?.claimedAt;return claimed||!hasAttach(mail);}
    function isUnclaimedMail(mail){return!!mail&&!mail?.claimedAt&&hasAttach(mail);}
    async function listAllMails(){const out=[];let p=1;while(true){const d=await mails(p,100);const rows=Array.isArray(d?.mails)?d.mails:[];out.push(...rows);const total=i(d?.total,rows.length);if(!rows.length||p*100>=total)break;p++;}return out;}
    async function getMailSnapshot(){const rows=await listAllMails();const unclaimed=[];const deletable=[];for(const mail of rows){if(isUnclaimedMail(mail))unclaimed.push(mail);else if(canDeleteMail(mail))deletable.push(mail);}return{rows,unclaimed,deletable};}
    async function cleanupReadMailsByOneClick(rows=null){
        const sourceRows=Array.isArray(rows)&&rows.length?rows:await listAllMails();
        const toDelete=(Array.isArray(rows)&&rows.length?rows:sourceRows).filter((mail)=>canDeleteMail(mail));
        if(!toDelete.length)return{deleted:0};
        let deleted=0;
        for(const mail of toDelete){
            const id=i(mail?.id,0);
            if(id<=0)continue;
            try{
                await deleteMailById(id);
                deleted++;
            }catch(e){
                log('ERROR','删除无附件邮件失败',e?.message||String(e));
            }
        }
        return{deleted};
    }
    const bagFull=(e)=>/背包|放不下|容量|满|full/i.test(String(e?.message||e||''));

    const ST={run:store.get(K.RUN,'0')==='1',dt:null,ut:null,mt:null,mailRun:false,mailToken:0,unclaimedMail:0,q:new Queue(),gatherRun:false,gatherToken:0,gatherStatus:'空闲',combatRun:false,combatToken:0,combatStatus:'空闲',combatProgressIndex:0,combatProgressTotal:0,autoDungeonRun:false,autoDungeonToken:0,autoDungeonStatus:'空闲',autoDungeonInstanceId:'',autoDungeonSessionId:'',autoDungeonBattleId:'',autoDungeonErrorStreak:0,autoDungeonEnteredCurrentRun:false,autoDungeonStopAfterCurrentRun:false,autoDungeonStopAfterCurrentRunReason:'',autoDungeonStaminaWaitTimer:null,autoDungeonHadActiveBattle:false,autoDungeonIdlePaused:false,
    autoDungeonStaminaWaiting:false,
    autoDungeonStaminaEndTime:0,
    autoDungeonStaminaCurrent:0,
    autoDungeonStaminaMax:100,
    autoDungeonIdleResumeTimer:null,
    autoDungeonPendingIdleResume:false,
    autoSectShopRun:false,sectShopTimer:null,lastSectShopActionDate:String(store.get(K.SFD,'')||'').trim(),
    autoSignInRun:false,autoSignInTimer:null,
    autoMonthCardRun:false,autoMonthCardTimer:null,
    autoWanderRun:false,autoWanderTimer:null,
    pageIdleWatchTimer:null,pageIdleFallbackBusy:false,pageIdleFallbackTriggered:false,pageLastActiveAt:Date.now(),pageIdleListenersBound:false,
    idleStateWatchTimer:null,idleStateKnown:false,idleStateRunning:false};
    const TEAM_FLOW_INTERVAL_MS=10000;
    const TEAM_CTRL={running:false,status:'空闲',busy:false,characterId:0,targetName:''};
    let cachedCharacterId=0;
    function rememberCharacterId(characterId){if(characterId>0)cachedCharacterId=characterId;}
    function getCachedCharacterId(){return TEAM_CTRL.characterId>0?TEAM_CTRL.characterId:cachedCharacterId;}
    async function ensureCharacterId(){const cachedId=getCachedCharacterId();if(cachedId>0)return cachedId;const snapshot=await getCharacterStaminaInfo();if(snapshot?.characterId>0)return snapshot.characterId;throw new Error('无法获取角色 ID');}
    const COMPANION_MONITOR_ITEMS=[
        {key:'monthCard',label:'修行月卡',itemDefId:'cons-monthcard-001',fallbackNames:['修行月卡']},
        {key:'renameCard',label:'易名符',itemDefId:'cons-rename-001',fallbackNames:['易名符']},
        {key:'advancedRecruit',label:'高级招募令',itemDefId:'cons-advanced-recruit-001',fallbackNames:['高级招募令']},
        {key:'epiphany',label:'顿悟符',itemDefId:'cons-dunwu-001',fallbackNames:['顿悟符']}
    ];
    const COMPANION_MONITOR={loading:false,error:'',snapshot:null,pending:false};
    function isInformationMonitorVisible(){return !!document.getElementById('jz2_monitor_card');}
    function setRunning(next){ST.run=!!next;store.set(K.RUN,ST.run?'1':'0');}
    const txt=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};

    function adjustStatNumberFont(){
        const ids=['jz2_d','jz2_u','jz2_m','jz2_um'];
        for(const id of ids){
            const el=document.getElementById(id);
            if(!el)continue;
            const raw=String(el.textContent||'').trim();
            const len=raw.length;
            let size='14px';
            if(len>=6&&len<=7) size='13px';
            else if(len>=8&&len<=9) size='12px';
            else if(len>=10) size='11px';
            el.style.fontSize=size;
            el.style.lineHeight='1.1';
            el.style.whiteSpace='nowrap';
            el.style.overflow='hidden';
            el.style.textOverflow='ellipsis';
        }
    }

    function renderStatusHistory(){
        const el=document.getElementById('jz2_status_steps');
        if(!el)return;
        if(!UI.statusHistory.length){el.textContent='空闲';return;}
        el.textContent=UI.statusHistory.join('\n');
    }
    function setStatus(v){
        txt('jz2_status',v);
        UI.statusHistory.push(`[${now()}] ${v}`);
        if(UI.statusHistory.length>5)UI.statusHistory=UI.statusHistory.slice(-5);
        renderStatusHistory();
    }
    function renderAutoActionStatus(){
        txt('jz2_auto_action_status',`${ST.gatherStatus} | ${ST.combatStatus}`);
    }
    function formatMonitorCooldown(seconds){
        const safe=Math.max(0,Math.floor(Number(seconds)||0));
        if(safe<=0)return '已就绪';
        const minute=60;
        const hour=60*minute;
        const day=24*hour;
        if(safe>=day){
            const d=Math.floor(safe/day);
            const h=Math.floor((safe%day)/hour);
            return h>0?`${d}天${h}小时`:`${d}天`;
        }
        if(safe>=hour){
            const h=Math.floor(safe/hour);
            const m=Math.floor((safe%hour)/minute);
            return m>0?`${h}小时${m}分`:`${h}小时`;
        }
        if(safe>=minute){
            const m=Math.floor(safe/minute);
            const s=safe%minute;
            return s>0?`${m}分${s}秒`:`${m}分`;
        }
        return `${safe}秒`;
    }
    const formatMonitorError=(error)=>{
        return String(error?.message||error||'').trim()||'未知错误';
    };
    function formatMonitorResearchStatus(status,error){
        if(error)return `获取失败：${formatMonitorError(error)}`;
        if(!status)return '--';
        if(!status.unlocked)return `未解锁（需${status.unlockRealm||'-'}）`;
        const remain=Math.max(0,Math.floor(Number(status.cooldownRemainingSeconds)||0));
        if(remain<=0)return '可立即领悟';
        return `${formatMonitorCooldown(remain)}后可领悟`;
    }
    function formatMonitorRecruitStatus(status,error){
        if(error)return `获取失败：${formatMonitorError(error)}`;
        if(!status)return '--';
        if(!status.unlocked)return `未解锁（需${status.unlockRealm||'-'}）`;
        if(status.currentJob){
            if(status.currentJob.status==='pending')return '生成中，等待AI完成';
            if(status.currentJob.status==='generated_draft')return '有伙伴预览待确认';
        }
        const remain=Math.max(0,Math.floor(Number(status.cooldownRemainingSeconds)||0));
        if(remain<=0)return '可立即招募';
        return `${formatMonitorCooldown(remain)}后可招募`;
    }
    function buildMonitorItemCounts(items){
        const counts={};
        for(const config of COMPANION_MONITOR_ITEMS){
            counts[config.key]=countInventoryItem(items,config.itemDefId||'',config.fallbackNames||[]);
        }
        return counts;
    }
    function renderCompanionMonitorSnapshot(){
        const card=document.getElementById('jz2_monitor_card');
        if(!card)return;
        const statusEl=document.getElementById('jz2_monitor_status_text');
        if(statusEl){
            let statusText='等待邮件巡检';
            if(COMPANION_MONITOR.loading)statusText='刷新中…';
            else if(COMPANION_MONITOR.snapshot)statusText='已更新';
            statusEl.textContent=statusText;
        }
        const snapshot=COMPANION_MONITOR.snapshot;
        const researchEl=document.getElementById('jz2_monitor_research');
        if(researchEl)researchEl.textContent=snapshot?.researchText||'--';
        const recruitEl=document.getElementById('jz2_monitor_recruit');
        if(recruitEl)recruitEl.textContent=snapshot?.recruitText||'--';
        const counts=snapshot?.items||{};
        for(const config of COMPANION_MONITOR_ITEMS){
            const el=document.getElementById(`jz2_monitor_item_${config.key}`);
            if(!el)continue;
            const val=counts[config.key];
            el.textContent=Number.isFinite(val)?String(val):'--';
        }
        const updatedEl=document.getElementById('jz2_monitor_updated_at');
        if(updatedEl){
            updatedEl.textContent=snapshot?.updatedAt
                ? new Date(snapshot.updatedAt).toLocaleTimeString('zh-CN',{hour12:false})
            : '--';
        }
        const errorEl=document.getElementById('jz2_monitor_error');
        if(errorEl){
            const errText=COMPANION_MONITOR.error||'';
            errorEl.textContent=errText;
            errorEl.style.display=errText?'inline':'none';
        }
    }
    function requestInformationMonitorRefresh(reason='manual'){
        if(!isInformationMonitorVisible())return;
        if(COMPANION_MONITOR.pending||COMPANION_MONITOR.loading)return;
        COMPANION_MONITOR.pending=true;
        ST.q.en('information-monitor',async()=>{
            try{
                if(!isInformationMonitorVisible())return;
                await refreshInformationMonitor(reason);
            }finally{
                COMPANION_MONITOR.pending=false;
            }
        });
    }
    async function refreshInformationMonitor(reason='manual'){
        COMPANION_MONITOR.loading=true;
        renderCompanionMonitorSnapshot();
        const errors=[];
        let characterId=null;
        try{
            characterId=await ensureCharacterId();
            rememberCharacterId(characterId);
        }catch(e){
            errors.push(`角色：${formatMonitorError(e)}`);
        }
        let researchStatus=null;
        let researchError=null;
        if(characterId){
            try{
                researchStatus=await get(`/character/${characterId}/technique/research/status`);
            }catch(e){
                researchError=e;
                errors.push(`研修：${formatMonitorError(e)}`);
            }
        }
        let recruitStatus=null;
        let recruitError=null;
        try{
            recruitStatus=await get('/partner/recruit/status');
        }catch(e){
            recruitError=e;
            errors.push(`招募：${formatMonitorError(e)}`);
        }
        let bagItems=[];
        let bagError=null;
        try{
            bagItems=await inv();
        }catch(e){
            bagError=e;
            errors.push(`背包：${formatMonitorError(e)}`);
        }
        const previousItems=COMPANION_MONITOR.snapshot?.items||{};
        const snapshot={
            researchText:formatMonitorResearchStatus(researchStatus,researchError),
            recruitText:formatMonitorRecruitStatus(recruitStatus,recruitError),
            items:bagError?previousItems:buildMonitorItemCounts(bagItems),
            updatedAt:Date.now(),
            reason
        };
        COMPANION_MONITOR.snapshot=snapshot;
        COMPANION_MONITOR.error=errors.join('；');
        COMPANION_MONITOR.loading=false;
        renderCompanionMonitorSnapshot();
    }
    function setAutoGatherStatus(v){ST.gatherStatus=String(v||'').trim()||'空闲';renderAutoActionStatus();}
    function setAutoCombatStatus(v){ST.combatStatus=String(v||'').trim()||'空闲';renderAutoActionStatus();}
    function formatAutoDungeonStatus(v){
        const base=String(v||'').trim()||'空闲';
        return `${base} | 已进入${cnt(K.AD)}次`;
    }
    function setAutoDungeonStatus(v){ST.autoDungeonStatus=String(v||'').trim()||'空闲';txt('jz2_auto_dungeon_status',formatAutoDungeonStatus(ST.autoDungeonStatus));}
    /*
 * 自动组队与体力监控模块
 * 作用：根据用户输入的目标玩家自动停止挂机、申请加入其小队，并在体力低于阈值时自动退队并恢复挂机，避免重复手动作业。
 * 输入/输出：输入为 localStorage 中的 teamAutoTarget/enableTeamAutoFlow、角色信息、队伍/挂机接口响应；输出为入队申请、退队/重新挂机的 API 调用与 UI 状态文本。
 * 数据流：配置表单 → teamAutoFlow 状态机 → /team/* 与 /idle/* 接口 → setAutoTeamStatus → 弹窗状态展示。
 * 关键边界条件：
 * 1. 未登录或未填写目标时直接跳过，不触发多余请求；
 * 2. 体力低于 15 且仍在战斗中只记录状态，避免误退队；恢复挂机依赖 /idle/config 完整参数，缺失时会提示错误而不重复重试。
 */
    const TEAM_LOG_LABEL='自动组队';
    function renderTeamStatusText(){const el=document.getElementById('jz2_team_status');if(el)el.textContent=TEAM_CTRL.status;}
    function setAutoTeamStatus(text,level='INFO'){const next=text||'空闲';const changed=TEAM_CTRL.status!==next;TEAM_CTRL.status=next;renderTeamStatusText();if(level==='ERROR'||changed){if(level==='ERROR')log('ERROR',TEAM_LOG_LABEL,TEAM_CTRL.status);else log('INFO',TEAM_LOG_LABEL,TEAM_CTRL.status);}}
    function getTeamSettings(){const conf=cfg();const target=String(conf.teamAutoTarget||'').trim();TEAM_CTRL.targetName=target;return{target};}
    function updateTeamFlowButton(){const btn=document.getElementById('jz2_team_apply_btn');if(!btn)return;const busy=TEAM_CTRL.busy;btn.textContent=busy?'自动组队中':'自动组队';btn.disabled=busy;btn.style.opacity=busy?'0.7':'1';btn.style.cursor=busy?'not-allowed':'pointer';btn.style.background=busy?'#94a3b8':'var(--primary,#1677ff)';btn.style.borderColor=busy?'#94a3b8':'var(--primary,#1677ff)';btn.style.color='#fff';}
    function startTeamAutoFlow(){
        if(TEAM_CTRL.busy){
            setAutoTeamStatus('自动组队进行中，请稍候');
            return;
        }
        if(!token()){
            setAutoTeamStatus('未登录，无法执行自动组队','ERROR');
            return;
        }
        const {target}=getTeamSettings();
        if(!target){
            setAutoTeamStatus('请先输入目标玩家昵称');
            return;
        }
        TEAM_CTRL.busy=true;
        TEAM_CTRL.running=true;
        updateTeamFlowButton();
        setAutoTeamStatus(`已启动，10 秒轮询体力/队伍（目标：${target}）`);
        runTeamFlowLoop(target).finally(()=>{
            TEAM_CTRL.busy=false;
            TEAM_CTRL.running=false;
            updateTeamFlowButton();
        });
    }
    async function runTeamFlowLoop(target){
        while(true){
            let snapshot=null;
            try{
                snapshot=await getCharacterStaminaInfo();
            }catch(e){
                setAutoTeamStatus(`获取角色信息失败：${e?.message||e}`,'ERROR');
                return;
            }
            if(!(snapshot?.characterId>0)){
                setAutoTeamStatus('无法获取角色信息，自动组队结束','ERROR');
                return;
            }
            TEAM_CTRL.characterId=snapshot.characterId;
            const staminaHint=`体力${snapshot.stamina}/${snapshot.staminaMax}`;
            if(snapshot.stamina<TEAM_STAMINA_THRESHOLD){
                const handled=await handleLowStaminaWhenSafe(snapshot,staminaHint);
                if(handled)return;
                await wait(TEAM_FLOW_INTERVAL_MS);
                continue;
            }
            const currentTeam=await fetchCurrentTeamInfo(snapshot.characterId);
            if(currentTeam?.id){
                const teamName=String(currentTeam.name||'未知').trim()||'未知';
                setAutoTeamStatus(`已在队伍（${teamName}），持续监控体力与审批状态…`);
                await wait(TEAM_FLOW_INTERVAL_MS);
                continue;
            }
            await tryJoinTargetTeam(snapshot,target);
            await wait(TEAM_FLOW_INTERVAL_MS);
        }
    }
    async function handleLowStaminaFlow(snapshot,staminaHint){
        try{
            const currentTeam=await fetchCurrentTeamInfo(snapshot.characterId);
            if(currentTeam?.id){
                await leaveTeamSafe(snapshot.characterId,`${staminaHint} 自动退队`);
            }
            await resumeIdleForAutomation(TEAM_LOG_LABEL,{silent:true,throwOnError:true});
            setAutoTeamStatus(`${staminaHint}，体力不足，已退出队伍并恢复挂机`);
        }catch(e){
            setAutoTeamStatus(`体力不足处理失败：${e?.message||e}`,'ERROR');
        }
    }
    async function handleLowStaminaWhenSafe(snapshot,staminaHint){
        const hasBattle=await hasActiveBattleSession();
        const hasDungeonBattle=isAutoDungeonBattleRunning();
        if(hasBattle||hasDungeonBattle){
            const scene=hasDungeonBattle?'秘境战斗':'战斗';
            setAutoTeamStatus(`${staminaHint}，体力不足但${scene}进行中，等待结束…`);
            return false;
        }
        await handleLowStaminaFlow(snapshot,staminaHint);
        return true;
    }
    async function tryJoinTargetTeam(snapshot,target){
        try{
            const lobbyTeams=await loadLobbyTeams(snapshot.characterId,target);
            const targetTeam=pickTargetTeamEntry(target,lobbyTeams);
            if(!targetTeam){
                setAutoTeamStatus(`未找到 ${target} 的队伍，继续检测体力…`);
                return;
            }
            await stopIdleForAutomation(TEAM_LOG_LABEL);
            await applyToTeamSafe(snapshot.characterId,targetTeam,target);
        }catch(e){
            setAutoTeamStatus(`申请加入失败：${e?.message||e}`,'ERROR');
        }
    }
    async function fetchCurrentTeamInfo(characterId){if(!(characterId>0))return null;try{const params=new URLSearchParams({characterId:String(characterId)});const data=await get(`/team/my?${params.toString()}`);return data&&typeof data==='object'?data:null;}catch(e){log('ERROR',TEAM_LOG_LABEL,`查询当前队伍失败：${e?.message||e}`);return null;}}
    async function loadLobbyTeams(characterId,search){if(!(characterId>0))return[];try{const params=new URLSearchParams({characterId:String(characterId),limit:'30'});if(search)params.append('search',search);const rows=await get(`/team/lobby/list?${params.toString()}`);return Array.isArray(rows)?rows:[];}catch(e){setAutoTeamStatus(`获取队伍列表失败：${e?.message||e}`,'ERROR');return[];}}
    function pickTargetTeamEntry(target,teams){if(!Array.isArray(teams)||!teams.length)return null;const trimmed=String(target||'').trim();const lower=trimmed.toLowerCase();const canonical=trimmed.endsWith('的小队')?trimmed:`${trimmed}的小队`;const canonicalLower=canonical.toLowerCase();const pipelines=[(team)=>String(team?.name||'').trim().toLowerCase()===canonicalLower,(team)=>String(team?.leader||'').trim().toLowerCase()===lower,(team)=>String(team?.name||'').trim().toLowerCase().includes(lower)];for(const matcher of pipelines){const hit=teams.find((team)=>matcher(team));if(hit)return hit;}return teams[0]||null;}
    async function applyToTeamSafe(characterId,teamEntry,targetLabel){
        if(!(teamEntry?.id&&characterId>0))return;
        const normalizedLabel=String(targetLabel||'').trim();
        const squadName=normalizedLabel.endsWith('的小队')?normalizedLabel:`${normalizedLabel}的小队`;
        const payload={characterId,teamId:teamEntry.id,message:`脚本自动申请加入${squadName}`};
        try{
            const resp=await post('/team/apply',payload);
            if(resp?.autoJoined){
                setAutoTeamStatus(`已自动加入 ${squadName}`);
            }else{
                setAutoTeamStatus(`已申请加入 ${squadName}，等待审批`);
            }
        }catch(e){
            const msg=String(e?.message||e||'');
            if(/已有待处理|已经申请/i.test(msg)){
                setAutoTeamStatus(`已有待处理申请，等待 ${squadName} 处理`);
                return;
            }
            throw e;
        }
    }
    async function leaveTeamSafe(characterId,reason){if(!(characterId>0))return;try{await post('/team/leave',{characterId});log('INFO',TEAM_LOG_LABEL,`已离开队伍${reason?`：${reason}`:''}`);}catch(e){const msg=String(e?.message||e||'');if(/不在任何队伍|not in team/i.test(msg))return;throw e;}}
    async function hasActiveBattleSession(){try{const data=await getCurrentBattleSession();const session=data?.session??data??null;if(!session)return false;const phase=String(session?.state?.phase||session?.status||'').toLowerCase();const battleId=String(session?.currentBattleId||session?.state?.battleId||'');if(!battleId)return false;if(phase.includes('finished')||phase.includes('completed')||phase.includes('abandoned'))return false;return true;}catch(e){log('DEBUG',TEAM_LOG_LABEL,`检测战斗状态失败：${e?.message||e}`);return false;}}
    async function restartIdleFromSavedConfig(){const resp=await get('/idle/config');const config=resp?.config||resp;if(!config||!config.mapId||!config.roomId||!config.targetMonsterDefId){throw new Error('挂机配置不完整，无法恢复');}const params={mapId:String(config.mapId),roomId:String(config.roomId),maxDurationMs:Math.max(60000,i(config.maxDurationMs,0)),autoSkillPolicy:config.autoSkillPolicy||{slots:[]},targetMonsterDefId:String(config.targetMonsterDefId),includePartnerInBattle:!!config.includePartnerInBattle};const startRes=await post('/idle/start',params);if(startRes?.success===false){throw new Error(startRes?.message||'恢复挂机失败');}return startRes?.data?.sessionId||startRes?.sessionId||'';}
    function normalizeAutomationLabel(label){const trimmed=String(label||'').trim();return trimmed||'自动脚本';}
    async function stopIdleForAutomation(label='自动脚本'){
        const logLabel=normalizeAutomationLabel(label);
        try{
            await post('/idle/stop',{});
            log('INFO',logLabel,'已请求停止挂机');
        }catch(e){
            const msg=String(e?.message||e||'');
            if(/未找到|没有活跃|not/i.test(msg)){
                log('DEBUG',logLabel,`停止挂机跳过：${msg}`);
                return;
            }
            throw e;
        }
    }
    async function resumeIdleForAutomation(label='自动脚本',options={}){
        const logLabel=normalizeAutomationLabel(label);
        const{
            silent=false,
            successStatusText='',
            errorStatusText='',
            onSuccess=null,
            onError=null,
            throwOnError=false
        }=options;
        try{
            const sessionId=await restartIdleFromSavedConfig();
            if(typeof onSuccess==='function'){
                onSuccess(sessionId);
            }else if(successStatusText){
                setStatus(successStatusText);
            }else if(!silent){
                setStatus(`${logLabel}：已恢复挂机`);
            }
            log('INFO',logLabel,`已恢复挂机${sessionId?` session=${sessionId}`:''}`);
            return sessionId;
        }catch(e){
            const msg=String(e?.message||e||'');
            if(typeof onError==='function'){
                onError(msg);
            }else if(errorStatusText){
                setStatus(errorStatusText.replace('%ERROR%',msg));
            }else if(!silent){
                setStatus(`${logLabel}恢复挂机失败：${msg}`);
            }
            log('ERROR',logLabel,`恢复挂机失败：${msg}`);
            if(throwOnError){
                throw e instanceof Error?e:new Error(msg);
            }
            return'';
        }
    }
    function markAutoDungeonProgress(v){resetAutoDungeonErrorStreak();setAutoDungeonStatus(v);}
    function resetAutoDungeonBattleFlag(){ST.autoDungeonHadActiveBattle=false;}
    function markAutoDungeonBattleActive(){
        if(!ST.autoDungeonHadActiveBattle){
            ST.autoDungeonHadActiveBattle=true;
        }
    }
    function hasAutoDungeonBattleHistory(){
        return ST.autoDungeonHadActiveBattle;
    }
    function isAutoDungeonBattleRunning(){
        // 判断秘境是否在战斗中，避免在战斗中触发退队逻辑
        return ST.autoDungeonRun&&!!ST.autoDungeonBattleId;
    }
    function getAutoDungeonSessionStatus(data){
        return String(data?.session?.status||'').trim();
    }
    function getAutoDungeonSessionBattleId(data){
        return String(data?.session?.currentBattleId||data?.state?.battleId||'').trim();
    }
    function isAutoDungeonSessionFinished(data){
        if(data?.finished===true)return true;
        const status=getAutoDungeonSessionStatus(data);
        return status==='completed'||status==='failed'||status==='abandoned';
    }
    function getAutoDungeonSessionPhase(data){
        return String(data?.state?.phase||'').trim();
    }
    function isAutoDungeonSessionBattleActive(data){
        const phase=getAutoDungeonSessionPhase(data);
        return phase==='roundStart'||phase==='action'||phase==='roundEnd';
    }
    function isAutoDungeonSessionBattleSettled(data){
        const result=String(data?.state?.result||'').trim();
        return result==='attacker_win'||result==='defender_win'||result==='draw';
    }
    function resetAutoDungeonSessionCounters(){
        rst(K.AD);
        ST.autoDungeonEnteredCurrentRun=false;
        ST.autoDungeonStopAfterCurrentRun=false;
        ST.autoDungeonStopAfterCurrentRunReason='';
        ST.autoDungeonSessionId='';
        resetAutoDungeonBattleFlag();
        resetAutoDungeonErrorStreak();
    }
    function markAutoDungeonEntered(){
        if(ST.autoDungeonEnteredCurrentRun)return false;
        ST.autoDungeonEnteredCurrentRun=true;
        add(K.AD,1);
        return true;
    }
    function resetAutoDungeonErrorStreak(){ST.autoDungeonErrorStreak=0;}
    function increaseAutoDungeonErrorStreak(){ST.autoDungeonErrorStreak=Math.max(0,i(ST.autoDungeonErrorStreak,0))+1;return ST.autoDungeonErrorStreak;}
    function setUnclaimedMail(v){ST.unclaimedMail=Math.max(0,i(v,0));txt('jz2_um',String(ST.unclaimedMail));adjustStatNumberFont();}
    async function refreshUnclaimedMail(){const snapshot=await getMailSnapshot();setUnclaimedMail(snapshot.unclaimed.length);return snapshot.unclaimed.length;}
    function upd(){txt('jz2_d',String(cnt(K.D)));txt('jz2_u',String(cnt(K.U)));txt('jz2_m',String(cnt(K.M)));txt('jz2_um',String(ST.unclaimedMail));adjustStatNumberFont();}
    function stopAutoMail(){
        ST.mailToken+=1;
        if(ST.mt)clearTimeout(ST.mt);
        ST.mt=null;
        ST.mailRun=false;
    }
    function stopTimers(){if(ST.dt)clearTimeout(ST.dt);if(ST.ut)clearTimeout(ST.ut);ST.dt=null;ST.ut=null;stopAutoMail();stopAutoSignIn();stopAutoMonthCard();stopAutoWander();stopAutoSectShopFragment();stopAutoDungeon(true);}
    function wait(ms){return new Promise(r=>setTimeout(r,ms));}

    function getInventoryItemDefId(item){
        return String(item?.def?.id||item?.itemDefId||item?.item_def_id||item?.def_id||'').trim();
    }

    function getInventoryItemName(item){
        return String(item?.def?.name||item?.name||'').trim();
    }

    function countInventoryItem(items,itemDefId,fallbackName=''){
        const fallbackNames=Array.isArray(fallbackName)?fallbackName.filter(Boolean):[fallbackName].filter(Boolean);
        let total=0;
        for(const item of(Array.isArray(items)?items:[])){
            const defId=getInventoryItemDefId(item);
            const name=getInventoryItemName(item);
            const matchesDef=itemDefId?defId===itemDefId:false;
            const matchesName=fallbackNames.length>0?fallbackNames.includes(name):false;
            if(!matchesDef&&!matchesName)continue;
            total+=Math.max(0,i(item?.qty,0));
        }
        return total;
    }

    function updateAutoGatherBtn(){
        const b=document.getElementById('jz2_auto_gather_toggle');
        if(!b)return;
        if(ST.gatherRun){
            b.textContent='停止采集';
            b.style.background='var(--danger,#ff4d4f)';
            b.style.borderColor='var(--danger,#ff4d4f)';
            b.style.color='#fff';
        }else{
            b.textContent='自动采集';
            b.style.background='var(--primary,#1677ff)';
            b.style.borderColor='var(--primary,#1677ff)';
            b.style.color='#fff';
        }
    }

    function updateAutoCombatBtn(){
        const b=document.getElementById('jz2_auto_combat_toggle');
        if(!b)return;
        if(ST.combatRun){
            b.textContent='停止打怪';
            b.style.background='var(--danger,#ff4d4f)';
            b.style.borderColor='var(--danger,#ff4d4f)';
            b.style.color='#fff';
        }else{
            b.textContent='自动打怪';
            b.style.background='var(--primary,#1677ff)';
            b.style.borderColor='var(--primary,#1677ff)';
            b.style.color='#fff';
        }
    }

    function updateAutoDungeonBtn(){
        const b=document.getElementById('jz2_auto_dungeon_toggle');
        if(!b)return;
        if(ST.autoDungeonRun){
            b.textContent='停止战斗';
            b.style.background='var(--danger,#ff4d4f)';
            b.style.borderColor='var(--danger,#ff4d4f)';
            b.style.color='#fff';
        }else{
            b.textContent='自动秘境';
            b.style.background='var(--primary,#1677ff)';
            b.style.borderColor='var(--primary,#1677ff)';
            b.style.color='#fff';
        }
    }

    function buildAutoActionMessage(index,total,status,name=''){
        const hasProgress=index>0&&total>0;
        const cleanStatus=String(status||'').trim();
        const cleanName=String(name||'').trim();
        return `${hasProgress?`${index}/${total} `:''}${cleanStatus}${cleanName?` ${cleanName}`:''}`.trim();
    }

    function shortenTimedStatus(text){
        const clean=String(text||'').trim();
        if(!clean)return clean;
        const stripped=clean.replace(/(\d+)(?:\.\d+)?\s*(?:s|秒)$/i,'').trim();
        return stripped||clean;
    }

    function normalizeStatusLabel(status){
        const shortened=shortenTimedStatus(status);
        if(/^等待采集/i.test(shortened))return '等待采集';
        if(/^冷却/i.test(shortened))return '冷却';
        if(/^等待复查/i.test(shortened))return '等待复查';
        return shortened;
    }

    function formatGatherLogMessage(index,total,status,name){
        const cleanName=String(name||'').trim();
        const displayStatus=normalizeStatusLabel(status);
        if(displayStatus==='采集'&&cleanName){
            return `采集 ${cleanName}`;
        }
        return buildAutoActionMessage(index,total,displayStatus,cleanName);
    }

    function formatCombatLogMessage(index,total,status,name){
        const cleanName=String(name||'').trim();
        const displayStatus=normalizeStatusLabel(status);
        const keepName=displayStatus==='前往';
        return buildAutoActionMessage(index,total,displayStatus,keepName?cleanName:'');
    }

    function reportAutoGather(index,total,status,name=''){
        const msg=formatGatherLogMessage(index,total,status,name);
        setAutoGatherStatus(msg);
        log('INFO','自动采集',msg);
    }

    function reportAutoCombat(index,total,status,name=''){
        if(index>0&&total>0){
            ST.combatProgressIndex=index;
            ST.combatProgressTotal=total;
        }
        const displayIndex=ST.combatProgressIndex;
        const displayTotal=ST.combatProgressTotal;
        const msg=formatCombatLogMessage(displayIndex,displayTotal,status,name);
        setAutoCombatStatus(msg);
        log('INFO','自动打怪',msg);
    }

    function getAutoDungeonSelectionValue(){
        return String(document.getElementById('jz2_auto_dungeon_select')?.value||cfg().autoDungeonSelection||'').trim();
    }

    function parseAutoDungeonSelection(raw){
        const text=String(raw||'').trim();
        if(!text)return null;
        const parts=text.split('@@');
        if(parts.length!==2)return null;
        const dungeonId=String(parts[0]||'').trim();
        const rank=i(parts[1],0);
        if(!dungeonId||rank<=0)return null;
        return{dungeonId,rank};
    }

    async function getCharacterStaminaInfo(){
        const data=await characterInfo();
        const character=data?.character||null;
        const stamina=Math.max(0,i(character?.stamina,0));
        const staminaMax=Math.max(1,i(character?.staminaMax??character?.stamina_max,1));
        const characterId=Math.max(0,i(character?.id,0));
        const nickname=String(character?.nickname||'');
        rememberCharacterId(characterId);
        return{stamina,staminaMax,characterId,nickname};
    }

    function applyDungeonOptionsToSelect(){
        const select=document.getElementById('jz2_auto_dungeon_select');
        if(!(select instanceof HTMLSelectElement))return;
        const selected=getAutoDungeonSelectionValue();
        const options=dungeonOptionsCache.length?dungeonOptionsCache:[{value:'',label:'暂无可选秘境'}];
        select.innerHTML=options.map((item)=>`<option value="${item.value}" ${item.value===selected?'selected':''}>${item.label}</option>`).join('');
        if(!selected&&options[0]?.value) select.value=options[0].value;
    }

    async function loadAutoDungeonOptions(){
        if(!dungeonOptionsCache.length){
            dungeonOptionsCache=STATIC_DUNGEON_OPTIONS.map((item)=>({...item}));
        }
        applyDungeonOptionsToSelect();
        return dungeonOptionsCache;
    }

    async function tryStartAutoDungeonBattle(selection){
        const createRes=await createDungeonInstance(selection.dungeonId,selection.rank);
        if(!createRes?.success||!createRes?.data?.instanceId)throw new Error(createRes?.message||'创建秘境实例失败');
        const instanceId=String(createRes.data.instanceId||'').trim();
        const startRes=await startDungeonBattleSession(instanceId);
        const sessionId=String(startRes?.data?.session?.sessionId||'').trim();
        const battleId=getAutoDungeonSessionBattleId(startRes?.data||null);
        if(!startRes?.success||!sessionId||!battleId)throw new Error(startRes?.message||'启动秘境战斗会话失败');
        ST.autoDungeonInstanceId=instanceId;
        ST.autoDungeonSessionId=sessionId;
        ST.autoDungeonBattleId=battleId;
        resetAutoDungeonBattleFlag();
        const phase=String(startRes?.data?.state?.phase||'').trim();
        if(phase==='roundStart'||phase==='action'||phase==='roundEnd'){
            markAutoDungeonBattleActive();
            markAutoDungeonProgress(`战斗中 | ${selection.label}`);
        }else if(phase==='finished'){
            markAutoDungeonProgress(`结算中 | ${selection.label}`);
        }else{
            markAutoDungeonProgress(`等待开战 | ${selection.label}`);
        }
        if(markAutoDungeonEntered())upd();
        log('INFO','自动秘境',`已进入 ${selection.label}; instanceId=${instanceId}; sessionId=${sessionId}; battleId=${ST.autoDungeonBattleId}`);
    }

    function isDungeonBattleActive(snapshot){
        const phase=String(snapshot?.state?.phase||'').trim();
        return phase==='roundStart'||phase==='action'||phase==='roundEnd';
    }

    function isDungeonBattleSettled(snapshot){
        const result=String(snapshot?.result||'').trim();
        return result==='attacker_win'||result==='defender_win'||result==='draw';
    }

    function isAutoDungeonBusyMessage(message){
        const detail=String(message||'').trim();
        return /角色正在战斗中|正在战斗中/.test(detail);
    }

    function isAutoDungeonStaminaShortageMessage(message){
        const detail=String(message||'').trim();
        return /体力不足/.test(detail);
    }

    function handleAutoDungeonRetryableError(message,staminaState){
        ST.autoDungeonBattleId='';
        ST.autoDungeonInstanceId='';
        ST.autoDungeonSessionId='';
        resetAutoDungeonBattleFlag();
        const detail=String(message||'').trim()||'未知异常';
        if(isAutoDungeonBusyMessage(detail)){
            setAutoDungeonStatus(`战斗占用中，等待重试 | ${detail} | 体力 ${staminaState.stamina}/${staminaState.staminaMax}`);
            log('INFO','自动秘境等待',detail);
            return true;
        }
        if(ST.autoDungeonEnteredCurrentRun&&isAutoDungeonStaminaShortageMessage(detail)){
            ST.autoDungeonStopAfterCurrentRun=true;
            ST.autoDungeonStopAfterCurrentRunReason=detail;
            setAutoDungeonStatus(`本轮结束后停止 | ${detail} | 体力 ${staminaState.stamina}/${staminaState.staminaMax}`);
            log('WARN','自动秘境挂起停止',detail);
            return true;
        }
        const streak=increaseAutoDungeonErrorStreak();
        const loopHint=Math.max(1,Math.ceil(streak/Math.max(1,AUTO_DUNGEON_MAX_ERROR_RETRY)));
        setAutoDungeonStatus(`连续失败${streak}次，自动第${loopHint}轮自检 | ${detail} | 体力 ${staminaState.stamina}/${staminaState.staminaMax}`);
        log('WARN','自动秘境重试',`连续失败${streak}次 | ${detail}`);
        return true;
    }

    async function handleAutoDungeonRoundFinished(selection,staminaState,status){
        const normalizedStatus=String(status||'-').trim()||'-';
        ST.autoDungeonBattleId='';
        ST.autoDungeonInstanceId='';
        ST.autoDungeonSessionId='';
        resetAutoDungeonBattleFlag();
        ST.autoDungeonEnteredCurrentRun=false;
        if(ST.autoDungeonStopAfterCurrentRun){
            const reason=ST.autoDungeonStopAfterCurrentRunReason||'本轮结束';
            ST.autoDungeonStopAfterCurrentRun=false;
            ST.autoDungeonStopAfterCurrentRunReason='';
            setAutoDungeonStatus(`本轮已结束，停止运行 | ${reason} | 体力 ${staminaState.stamina}/${staminaState.staminaMax}`);
            log('INFO','自动秘境结束后停止',reason);
            const resumeStatus=`自动秘境停止条件：${reason}`;
            await resumeIdleAfterAutoDungeon({
                successStatusText:`${resumeStatus}，已恢复挂机`,
                errorStatusText:`${resumeStatus}，但恢复挂机失败：%ERROR%`
    });
            stopAutoDungeon(true);
            return true;
        }
        log('INFO','自动秘境',`本轮完成 | status=${normalizedStatus}`);
        await tryRestartAutoDungeonIfPossible(selection,staminaState);
        return true;
    }

    async function tryRestartAutoDungeonIfPossible(selection,staminaState){
        ST.autoDungeonBattleId='';
        ST.autoDungeonInstanceId='';
        ST.autoDungeonSessionId='';
        resetAutoDungeonBattleFlag();
        setAutoDungeonStatus(`继续进入 | ${selection.label}`);
        try{
            await tryStartAutoDungeonBattle(selection);
            return true;
        }catch(e){
            const message=String(e?.message||e||'').trim();
            if(handleAutoDungeonRetryableError(message,staminaState)){
                log('DEBUG','自动秘境续开等待',message);
            }
            return false;
        }
    }

    async function tryAdvanceAutoDungeon(selection,staminaState){
        if(!ST.autoDungeonSessionId&&!ST.autoDungeonInstanceId)return false;
        try{
            const nextRes=ST.autoDungeonSessionId
            ? await advanceBattleSession(ST.autoDungeonSessionId)
            : await nextDungeonInstance(ST.autoDungeonInstanceId);
            if(!nextRes?.success||!nextRes?.data)return false;
            resetAutoDungeonErrorStreak();
            if(ST.autoDungeonSessionId){
                const nextSessionId=String(nextRes?.data?.session?.sessionId||ST.autoDungeonSessionId).trim();
                if(nextSessionId)ST.autoDungeonSessionId=nextSessionId;
            }
            if(isAutoDungeonSessionFinished(nextRes.data)||nextRes.data.finished){
                return handleAutoDungeonRoundFinished(
                    selection,
                    staminaState,
                    ST.autoDungeonSessionId?getAutoDungeonSessionStatus(nextRes.data):String(nextRes.data.status||'-')
                );
            }
            const nextBattleId=ST.autoDungeonSessionId
            ? getAutoDungeonSessionBattleId(nextRes.data)
            : String(nextRes.data.battleId||'').trim();
            if(nextBattleId){
                ST.autoDungeonBattleId=nextBattleId;
                markAutoDungeonBattleActive();
                markAutoDungeonProgress(`继续战斗 | ${selection.label}`);
                log('INFO','自动秘境',`继续战斗 | battleId=${nextBattleId}`);
                return true;
            }
        }catch(e){
            const message=String(e?.message||e||'').trim();
            if(handleAutoDungeonRetryableError(message,staminaState)){
                log('DEBUG','自动秘境续开等待',message);
            }
            return false;
        }
        markAutoDungeonProgress(`结算中 | ${selection.label}`);
        return true;
    }

    async function tickAutoDungeon(tokenRef,selection){
        const staminaState=await getCharacterStaminaInfo();
        
    // 前置体力检查
    if (staminaState.stamina < TEAM_STAMINA_THRESHOLD) {  // 假设需要20点体力
        // 如果已经在等待体力恢复中，只更新显示，不重启倒计时
        if (ST.autoDungeonStaminaWaiting) {
            // 保存当前体力信息到ST，供interval使用
            ST.autoDungeonStaminaCurrent = staminaState.stamina;
            ST.autoDungeonStaminaMax = staminaState.staminaMax;

            // 基于结束时间计算剩余时间，避免重复刷新
            const remainingMs = Math.max(0, ST.autoDungeonStaminaEndTime - Date.now());
            const remainingSec = Math.ceil(remainingMs / 1000);
            const hours = Math.floor(remainingSec / 3600);
            const mins = Math.floor((remainingSec % 3600) / 60);
            const secs = remainingSec % 60;
            let timeStr;
            if (hours > 0) {
                timeStr = mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`;
            } else if (mins > 0) {
                timeStr = `${mins}分${secs}秒`;
            } else {
                timeStr = `${secs}秒`;
            }
            setAutoDungeonStatus(`体力不足 ${staminaState.stamina}/${staminaState.staminaMax}，恢复挂机并等待 ${timeStr}后重试`);
            return;  // 保持现有倒计时，不再重复启动
        }

        // 首次进入，启动倒计时
        ST.autoDungeonStaminaWaiting = true;
        ST.autoDungeonStaminaCurrent = staminaState.stamina;
        ST.autoDungeonStaminaMax = staminaState.staminaMax;
        const waitMs = 3600000; // 1小时 = 3600000毫秒
        ST.autoDungeonStaminaEndTime = Date.now() + waitMs;  // 设置结束时间戳
        const waitSec = Math.floor(waitMs / 1000); // 3600秒
        let remainingSec = waitSec;

        // 立即显示初始状态
        setAutoDungeonStatus(`体力不足 ${staminaState.stamina}/${staminaState.staminaMax}，恢复挂机并等待 ${remainingSec}秒后重试`);
        log('WARN', '自动秘境', `体力不足，准备恢复挂机，${remainingSec}秒后自动重试`);

        await resumeIdleAfterAutoDungeon({
            successStatusText: `体力不足，自动秘境暂停，已恢复挂机，${remainingSec}秒后自动重试`,
            errorStatusText: '体力不足，自动秘境暂停，但恢复挂机失败：%ERROR%'
        });

        // 清除之前的定时器
        if (ST.autoDungeonStaminaWaitTimer) {
            clearTimeout(ST.autoDungeonStaminaWaitTimer);
        }
        // 清除之前的倒计时interval
        if (ST.autoDungeonStaminaCountdownInterval) {
            clearInterval(ST.autoDungeonStaminaCountdownInterval);
        }

        // 设置每秒更新倒计时的interval
        ST.autoDungeonStaminaCountdownInterval = setInterval(() => {
            // 基于结束时间计算剩余时间，避免累积误差
            const remainingMs = Math.max(0, ST.autoDungeonStaminaEndTime - Date.now());
            const remainingSec = Math.ceil(remainingMs / 1000);

            if (remainingSec > 0 && ST.autoDungeonRun) {
                // 智能时间格式化：根据剩余时间自动选择最合适的显示格式
                const hours = Math.floor(remainingSec / 3600);
                const mins = Math.floor((remainingSec % 3600) / 60);
                const secs = remainingSec % 60;

                let timeStr;
                if (hours > 0) {
                    // 小时级别：显示 "X小时XX分"（省略秒，避免太长）
                    timeStr = mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`;
                } else if (mins > 0) {
                    // 分钟级别：显示 "XX分XX秒"
                    timeStr = `${mins}分${secs}秒`;
                } else {
                    // 秒级别：显示 "XX秒"
                    timeStr = `${secs}秒`;
                }

                // 使用 ST 中保存的最新体力信息
                const stamina = ST.autoDungeonStaminaCurrent || 0;
                const staminaMax = ST.autoDungeonStaminaMax || 100;
                setAutoDungeonStatus(`体力不足 ${stamina}/${staminaMax}，恢复挂机并等待 ${timeStr}后重试`);
            } else {
                clearInterval(ST.autoDungeonStaminaCountdownInterval);
                ST.autoDungeonStaminaCountdownInterval = null;
            }
        }, 1000);

        // 设置1小时后自动重试的定时器
        ST.autoDungeonStaminaWaitTimer = setTimeout(() => {
            // 清除倒计时interval
            if (ST.autoDungeonStaminaCountdownInterval) {
                clearInterval(ST.autoDungeonStaminaCountdownInterval);
                ST.autoDungeonStaminaCountdownInterval = null;
            }
            // 清除等待标志位
            ST.autoDungeonStaminaWaiting = false;
            ST.autoDungeonStaminaEndTime = 0;

            if (!ST.autoDungeonRun) return; // 如果自动秘境已停止，则不执行
            log('INFO', '自动秘境', '1小时等待结束，检查体力状态');
            // 重新触发自动秘境循环
            if (ST.autoDungeonRun && tokenRef === ST.autoDungeonToken) {
                tickAutoDungeon(tokenRef, selection);
            }
        }, waitMs);
        return;
    }
          
        if(!ST.autoDungeonRun||tokenRef!==ST.autoDungeonToken)return;
        const finishIfReady=async(statusHint)=>{
            if(!hasAutoDungeonBattleHistory())return false;
            await handleAutoDungeonRoundFinished(selection,staminaState,statusHint);
            return true;
        };
        if(ST.autoDungeonBattleId){
            let sessionData=null;
            if(ST.autoDungeonSessionId){
                sessionData=await getBattleSession(ST.autoDungeonSessionId).catch(()=>null);
            }else{
                sessionData=await getBattleSessionByBattleId(ST.autoDungeonBattleId).catch(()=>null);
                const sessionId=String(sessionData?.session?.sessionId||'').trim();
                if(sessionId)ST.autoDungeonSessionId=sessionId;
            }
            if(sessionData?.session){
                const sessionBattleId=getAutoDungeonSessionBattleId(sessionData);
                if(sessionBattleId){
                    ST.autoDungeonBattleId=sessionBattleId;
                }
                if(isAutoDungeonSessionBattleActive(sessionData)){
                    markAutoDungeonBattleActive();
                    markAutoDungeonProgress(`战斗中 | 体力 ${staminaState.stamina}/${staminaState.staminaMax}`);
                    return;
                }
                const sessionStatus=getAutoDungeonSessionStatus(sessionData);
                const sessionPhase=getAutoDungeonSessionPhase(sessionData);
                if(await finishIfReady(sessionStatus||sessionPhase||'-')){
                    return;
                }
                markAutoDungeonProgress(`秘境进行中 | ${selection.label}`);
                return;
            }
            const snapshot=await battleState(ST.autoDungeonBattleId).catch(()=>null);
            if(isDungeonBattleActive(snapshot)){
                markAutoDungeonBattleActive();
                markAutoDungeonProgress(`战斗中 | 体力 ${staminaState.stamina}/${staminaState.staminaMax}`);
                return;
            }
            const resultHint=String(snapshot?.result||snapshot?.state?.result||'-');
            if(await finishIfReady(resultHint)){
                return;
            }
            if(!snapshot&&ST.autoDungeonInstanceId){
                const instanceRes=await getDungeonInstance(ST.autoDungeonInstanceId).catch(()=>null);
                const instance=instanceRes?.instance||null;
                const currentBattleId=String(instance?.currentBattleId||'').trim();
                const status=String(instance?.status||'').trim();
                if(currentBattleId){
                    ST.autoDungeonBattleId=currentBattleId;
                    markAutoDungeonProgress(`等待开战 | ${selection.label}`);
                    return;
                }
                if(status==='running'){
                    markAutoDungeonProgress(`秘境进行中 | ${selection.label}`);
                    return;
                }
                if(status&&await finishIfReady(status)){
                    return;
                }
            }
            markAutoDungeonProgress(`等待开战 | ${selection.label}`);
            return;
        }
        if(ST.autoDungeonInstanceId){
            let sessionData=null;
            if(ST.autoDungeonSessionId){
                sessionData=await getBattleSession(ST.autoDungeonSessionId).catch(()=>null);
            }
            if(sessionData?.session){
                const currentBattleId=getAutoDungeonSessionBattleId(sessionData);
                if(currentBattleId){
                    ST.autoDungeonBattleId=currentBattleId;
                    markAutoDungeonProgress(`恢复战斗 | ${selection.label}`);
                    return;
                }
                const sessionStatus=getAutoDungeonSessionStatus(sessionData);
                const sessionPhase=getAutoDungeonSessionPhase(sessionData);
                if(sessionStatus==='running'||sessionStatus==='waiting_transition'){
                    markAutoDungeonProgress(`秘境进行中 | ${selection.label}`);
                    return;
                }
                if(await finishIfReady(sessionStatus||sessionPhase||'-')){
                    return;
                }
            }
            const instanceRes=await getDungeonInstance(ST.autoDungeonInstanceId).catch(()=>null);
            const instance=instanceRes?.instance||null;
            const currentBattleId=String(instance?.currentBattleId||'').trim();
            const status=String(instance?.status||'').trim();
            if(currentBattleId){
                ST.autoDungeonBattleId=currentBattleId;
                markAutoDungeonProgress(`恢复战斗 | ${selection.label}`);
                return;
            }
            if(status==='running'){
                markAutoDungeonProgress(`秘境进行中 | ${selection.label}`);
                return;
            }
            if(status&&await finishIfReady(status)){
                return;
            }
            ST.autoDungeonInstanceId='';
        }
        setAutoDungeonStatus(`准备进入 | ${selection.label}`);
        try{
            await tryStartAutoDungeonBattle(selection);
        }catch(e){
            const message=String(e?.message||e||'').trim();
            if(handleAutoDungeonRetryableError(message,staminaState)){
                log('DEBUG','自动秘境进入等待',message);
            }
            return;
        }
    }

    async function waitAutoGatherMs(ms,tokenRef){
        let left=Math.max(0,Math.ceil(Number(ms)||0));
        while(ST.gatherRun&&tokenRef===ST.gatherToken&&left>0){
            const step=Math.min(1000,left);
            await wait(step);
            left-=step;
        }
        return ST.gatherRun&&tokenRef===ST.gatherToken;
    }

    async function waitAutoCombatMs(ms,tokenRef){
        let left=Math.max(0,Math.ceil(Number(ms)||0));
        while(ST.combatRun&&tokenRef===ST.combatToken&&left>0){
            const step=Math.min(1000,left);
            await wait(step);
            left-=step;
        }
        return ST.combatRun&&tokenRef===ST.combatToken;
    }

    function normalizeResourceObject(obj){
        if(!obj||obj.type!=='item'||obj.object_kind!=='resource')return null;
        return {
            id:String(obj.id||'').trim(),
            name:String(obj.name||obj.id||'').trim(),
            taskMarker:String(obj.task_marker||'').trim(),
            cooldownSec:Math.max(0,i(obj?.resource?.cooldownSec,0)),
            gatherUntil:String(obj?.resource?.cooldownUntil||'').trim(),
            remaining:Math.max(0,i(obj?.resource?.remaining,0))
        };
    }
    const GATHER_TASK_MARKER_ACTIVE='!';
    function isActiveGatherTask(entry){
        if(!entry||typeof entry!=='object')return false;
        const marker=String(entry?.state?.taskMarker||'').trim();
        return marker===GATHER_TASK_MARKER_ACTIVE;
    }
    function pickActiveGatherEntries(entries){
        return (Array.isArray(entries)?entries:[]).filter((entry)=>isActiveGatherTask(entry));
    }

    function buildRoomKey(mapId,roomId){
        return `${mapId}@@${roomId}`;
    }

    function buildGatherSpotKey(mapId,roomId,resourceId){
        return `${mapId}@@${roomId}@@${resourceId}`;
    }

    function buildMonsterSpotKey(mapId,roomId,monsterId){
        return `${mapId}@@${roomId}@@${monsterId}`;
    }

    function buildRoomResourceStateMap(objects){
        const states=new Map();
        for(const obj of objects){
            const normalized=normalizeResourceObject(obj);
            if(!normalized)continue;
            states.set(normalized.id,normalized);
        }
        return states;
    }

    function groupSpotsByRoom(spots){
        const grouped=new Map();
        for(const spot of spots){
            const roomKey=buildRoomKey(spot.mapId,spot.roomId);
            const current=grouped.get(roomKey);
            if(current){
                current.spots.push(spot);
                continue;
            }
            grouped.set(roomKey,{
                mapId:spot.mapId,
                roomId:spot.roomId,
                roomName:spot.roomName,
                spots:[spot]
            });
        }
        return Array.from(grouped.values());
    }

    async function collectGatherSpots(){
        return STATIC_GATHER_SPOTS.map((spot)=>({...spot}));
    }

    async function collectMonsterSpots(){
        return STATIC_MONSTER_SPOTS.map((spot)=>({...spot}));
    }

    async function loadGatherSpotStates(spots,onProgress){
        const states=[];
        const rooms=groupSpotsByRoom(spots);
        for(let idx=0;idx<rooms.length;idx++){
            const room=rooms[idx];
            if(typeof onProgress==='function')onProgress(idx+1,rooms.length,room);
            const resourceStateMap=buildRoomResourceStateMap(await roomObjects(room.mapId,room.roomId));
            for(const spot of room.spots){
                const state=resourceStateMap.get(spot.resourceId);
                if(!state)continue;
                states.push({...spot,state});
            }
        }
        return states;
    }

    function buildGatherGroups(spots,states){
        const stateMap=new Map();
        for(const entry of states){
            stateMap.set(buildGatherSpotKey(entry.mapId,entry.roomId,entry.resourceId),entry);
        }
        const groups=new Map();
        for(const spot of spots){
            const entry=stateMap.get(buildGatherSpotKey(spot.mapId,spot.roomId,spot.resourceId))||null;
            const groupKey=spot.resourceId;
            const current=groups.get(groupKey);
            if(current){
                current.spots.push(spot);
                if(entry){
                    current.states.push(entry);
                    if(!current.name&&entry.state.name)current.name=entry.state.name;
                }
                continue;
            }
            groups.set(groupKey,{
                key:groupKey,
                resourceId:spot.resourceId,
                name:entry?.state?.name||spot.resourceId,
                spots:[spot],
                states:entry?[entry]:[]
            });
        }
        return Array.from(groups.values());
    }

    function buildTaskMonsterRemainingMap(tasks){
        const remainingMap=new Map();
        for(const task of(Array.isArray(tasks)?tasks:[])){
            if(String(task?.status||'').trim()!=='ongoing')continue;
            for(const objective of(Array.isArray(task?.objectives)?task.objectives:[])){
                if(String(objective?.type||'').trim()!=='kill_monster')continue;
                const monsterId=String(objective?.params?.monster_id||'').trim();
                if(!monsterId)continue;
                const target=Math.max(0,i(objective?.target,0));
                const done=Math.max(0,i(objective?.done,0));
                const remain=Math.max(0,target-done);
                if(remain<=0)continue;
                remainingMap.set(monsterId,(remainingMap.get(monsterId)||0)+remain);
            }
        }
        return remainingMap;
    }

    async function loadCurrentTaskMonsterRemainingMap(){
        const tasks=[];
        for(const category of TASK_CATEGORIES){
            const rows=await taskOverview(category);
            tasks.push(...rows);
        }
        return buildTaskMonsterRemainingMap(tasks);
    }

    function collectTaskMonsterSpots(spots,remainingMap){
        return spots.filter((spot)=>remainingMap.has(spot.monsterId));
    }

    function normalizeMonsterObject(obj){
        if(!obj||obj.type!=='monster')return null;
        return {
            id:String(obj.id||'').trim(),
            name:String(obj.name||obj.id||'').trim(),
            taskMarker:String(obj.task_marker||'').trim()
        };
    }

    function findTaskMonsterState(objects,monsterId){
        for(const obj of(Array.isArray(objects)?objects:[])){
            const normalized=normalizeMonsterObject(obj);
            if(!normalized||normalized.id!==monsterId)continue;
            return normalized;
        }
        return null;
    }

    function parseWaitMsFromMessage(message,fallbackMs=3000){
        const msg=String(message||'');
        const secondMatch=msg.match(/(\d+)\s*秒/);
        if(secondMatch){
            return Math.max(1000,Math.ceil(Number(secondMatch[1])||0)*1000);
        }
        return fallbackMs;
    }

    async function moveToRoom(mapId,roomId){
        await updateCharacterPosition(mapId,roomId);
    }

    async function moveToCombatSpot(spot){
        await moveToRoom(spot.mapId,spot.roomId);
    }

    async function isBattleStillActive(currentBattleId){
        if(!currentBattleId)return false;
        try{
            const snapshot=await battleState(currentBattleId);
            const stateData=snapshot?.state||null;
            if(!stateData)return false;
            return String(stateData?.phase||'').trim()!=='finished';
        }catch{
            return false;
        }
    }

    async function runAutoBattleLoop(spot,initialBattleId,tokenRef){
        let currentBattleId=String(initialBattleId||'').trim();
        while(ST.combatRun&&tokenRef===ST.combatToken){
            const objects=await roomObjects(spot.mapId,spot.roomId);
            const monsterState=findTaskMonsterState(objects,spot.monsterId);
            if(!monsterState||monsterState.taskMarker!=='!'){
                if(currentBattleId&&await isBattleStillActive(currentBattleId)){
                    await abandonBattle(currentBattleId).catch(()=>{});
                }
                return{finished:true,stopped:false,message:'任务怪已清除'};
            }
            if(currentBattleId){
                const active=await isBattleStillActive(currentBattleId);
                if(active){
                    reportAutoCombat(0,0,'战斗中',spot.monsterName);
                }else{
                    currentBattleId='';
                }
            }
            if(!currentBattleId){
                try{
                    await moveToCombatSpot(spot);
                    const started=await startBattle([spot.monsterId]);
                    currentBattleId=String(started?.data?.battleId||'').trim();
                    if(currentBattleId){
                        reportAutoCombat(0,0,'已开战',spot.monsterName);
                    }
                }catch(e){
                    log('DEBUG','自动打怪开战轮询',`${spot.monsterName}:${e?.message||String(e)}`);
                }
            }
            const ok=await waitAutoCombatMs(10000,tokenRef);
            if(!ok){
                if(currentBattleId&&await isBattleStillActive(currentBattleId)){
                    await abandonBattle(currentBattleId).catch(()=>{});
                }
                return{finished:false,stopped:true,message:'自动打怪已停止'};
            }
        }
        if(currentBattleId&&await isBattleStillActive(currentBattleId)){
            await abandonBattle(currentBattleId).catch(()=>{});
        }
        return{finished:false,stopped:true,message:'自动打怪已停止'};
    }

    async function refreshGatherGroup(group){
        const states=await loadGatherSpotStates(group.spots);
        return {
            ...group,
            name:states[0]?.state?.name||group.name||group.resourceId,
            states
        };
    }

    function resolveGatherWaitMs(data){
        const gatherUntilMs=Date.parse(String(data?.gatherUntil||''));
        if(Number.isFinite(gatherUntilMs)&&gatherUntilMs>Date.now()) return Math.max(0,gatherUntilMs-Date.now());
        const actionSec=Math.max(0,i(data?.actionSec,0));
        const cooldownSec=Math.max(0,i(data?.cooldownSec,0));
        return Math.max(actionSec,cooldownSec)*1000;
    }

    async function processGatherGroup(group,index,total,tokenRef){
        if(!ST.gatherRun||tokenRef!==ST.gatherToken)return;
        let currentGroup=null;
        let queue=[];
        let rotated=0;
        let gathered=false;
        let queueEmptyReason='';
        const describe=(entry)=>{
            return entry?.state?.name||currentGroup?.name||entry?.resourceId||group.name||group.resourceId;
        };
        const refreshQueue=async()=>{
            currentGroup=await refreshGatherGroup(group);
            queue=pickActiveGatherEntries(currentGroup.states);
            rotated=0;
            if(queue.length){
                queueEmptyReason='';
                return true;
            }
            queueEmptyReason=currentGroup.states.length>0?'task-done':'no-state';
            return false;
        };
        const ensureQueue=async(force=false)=>{
            if(force||!queue.length){
                return refreshQueue();
            }
            return true;
        };
        const reportQueueDrain=()=>{
            const status=gathered?'完成':(queueEmptyReason==='task-done'?'已完成':'跳过');
            reportAutoGather(index,total,status,currentGroup?.name||group.name||group.resourceId);
        };
        if(!await ensureQueue(true)){
            reportQueueDrain();
            return;
        }
        while(ST.gatherRun&&tokenRef===ST.gatherToken){
            if(!queue.length){
                if(!await ensureQueue(true)){
                    reportQueueDrain();
                    return;
                }
                continue;
            }
            const candidate=queue.shift();
            const state=candidate?.state;
            if(!state){
                await ensureQueue(true);
                continue;
            }
            const cooldownSec=Math.max(0,i(state.cooldownSec,0));
            const label=describe(candidate);
            if(cooldownSec>0){
                queue.push(candidate);
                rotated++;
                reportAutoGather(index,total,`冷却${cooldownSec}s`,label);
                if(rotated>=queue.length){
                    const minCooldown=Math.min(...queue.map((entry)=>Math.max(0,i(entry?.state?.cooldownSec,0))).filter((v)=>v>0));
                    rotated=0;
                    const waitSec=Number.isFinite(minCooldown)&&minCooldown>0?minCooldown:1;
                    const ok=await waitAutoGatherMs(waitSec*1000,tokenRef);
                    if(!ok)return;
                    await ensureQueue(true);
                }
                continue;
            }
            try{
                const resp=await gatherResource(candidate.mapId,candidate.roomId,candidate.resourceId);
                const data=resp?.data||{};
                const waitMs=resolveGatherWaitMs(data);
                const gained=Math.max(0,i(data?.qty,0));
                if(gained>0){
                    gathered=true;
                    reportAutoGather(index,total,'采集',label);
                }else if(waitMs>0){
                    const waitSec=Math.max(1,Math.ceil(waitMs/1000));
                    reportAutoGather(index,total,`等待采集${waitSec}s`,label);
                    const ok=await waitAutoGatherMs(waitMs,tokenRef);
                    if(!ok)return;
                }else{
                    reportAutoGather(index,total,'检索',label);
                }
                await ensureQueue(true);
            }catch(e){
                log('ERROR','自动采集失败',e?.message||String(e));
                if(!await ensureQueue(true)){
                    reportAutoGather(index,total,'结束',group.name||group.resourceId);
                    return;
                }
            }
        }
    }

    async function processCombatSpot(spot,index,total,tokenRef){
        while(ST.combatRun&&tokenRef===ST.combatToken){
            const remainingMap=await loadCurrentTaskMonsterRemainingMap();
            const remaining=Math.max(0,remainingMap.get(spot.monsterId)||0);
            if(remaining<=0){
                reportAutoCombat(index,total,'完成',spot.monsterName);
                return;
            }
            reportAutoCombat(index,total,'前往',spot.roomName);
            await moveToRoom(spot.mapId,spot.roomId);
            const objects=await roomObjects(spot.mapId,spot.roomId);
            const monsterState=findTaskMonsterState(objects,spot.monsterId);
            if(!monsterState||monsterState.taskMarker!=='!'){
                reportAutoCombat(index,total,'跳过',spot.monsterName);
                return;
            }
            reportAutoCombat(index,total,'轮询',spot.monsterName);
            try{
                const started=await startBattle([spot.monsterId]);
                const currentBattleId=String(started?.data?.battleId||'').trim();
                const battleResult=await runAutoBattleLoop(spot,currentBattleId,tokenRef);
                if(battleResult.stopped)return;
                if(battleResult.finished){
                    reportAutoCombat(index,total,'完成',spot.monsterName);
                    return;
                }
            }catch(e){
                const message=String(e?.message||e||'');
                const waitMs=parseWaitMsFromMessage(message,10000);
                log('DEBUG','自动打怪轮询等待',`${spot.monsterName}:${message}`);
                reportAutoCombat(index,total,`等待复查${Math.max(1,Math.ceil(waitMs/1000))}s`,spot.monsterName);
                const ok=await waitAutoCombatMs(waitMs,tokenRef);
                if(!ok)return;
            }
        }
    }

    function stopAutoGather(silent=false){
        ST.gatherRun=false;
        ST.gatherToken+=1;
        updateAutoGatherBtn();
        if(!silent){
            setAutoGatherStatus('空闲');
            log('INFO','自动采集','已停止');
        }
    }

    function stopAutoCombat(silent=false){
        ST.combatRun=false;
        ST.combatToken+=1;
        ST.combatProgressIndex=0;
        ST.combatProgressTotal=0;
        updateAutoCombatBtn();
        if(!silent){
            setAutoCombatStatus('空闲');
            log('INFO','自动打怪','已停止');
        }
    }

    function stopAutoDungeon(silent=false){
        ST.autoDungeonRun=false;
        ST.autoDungeonToken+=1;
        ST.autoDungeonInstanceId='';
        ST.autoDungeonSessionId='';
        ST.autoDungeonBattleId='';
        resetAutoDungeonBattleFlag();
        ST.autoDungeonEnteredCurrentRun=false;
        ST.autoDungeonStopAfterCurrentRun=false;
        ST.autoDungeonStopAfterCurrentRunReason='';
        resetAutoDungeonErrorStreak();
        // 清除体力等待定时器和标志位
        if(ST.autoDungeonStaminaWaitTimer){
            clearTimeout(ST.autoDungeonStaminaWaitTimer);
            ST.autoDungeonStaminaWaitTimer=null;
        }
        if(ST.autoDungeonStaminaCountdownInterval){
            clearInterval(ST.autoDungeonStaminaCountdownInterval);
            ST.autoDungeonStaminaCountdownInterval=null;
        }
        ST.autoDungeonStaminaWaiting=false;
        ST.autoDungeonStaminaEndTime=0;
        ST.autoDungeonStaminaCurrent=0;
        ST.autoDungeonStaminaMax=100;
        updateAutoDungeonBtn();
        if(!silent){
            setAutoDungeonStatus('空闲');
            log('INFO','自动秘境','已停止');
        }
    }

    /*
 * 自动秘境挂机控制
 * 作用：集中处理自动秘境暂停挂机与恢复挂机，避免在不同停止场景重复写 `stopIdleForAutomation` / `resumeIdleForAutomation`。
 * 输入：可选的状态文案配置，复用 `resumeIdleForAutomation` 的 options。
 * 数据流：自动秘境入口在启动时先调用 `pauseIdleForAutoDungeon`，停止条件触发或收尾阶段调用 `resumeIdleAfterAutoDungeon`。
 * 边界：1）若暂停失败则不会标记 `autoDungeonIdlePaused`，收尾阶段会自动跳过恢复；2）恢复函数在多次调用时只会生效一次，防止重复恢复挂机。
 */
    async function pauseIdleForAutoDungeon(){
        try{
            await stopIdleForAutomation('自动秘境');
            ST.autoDungeonIdlePaused=true;
            return true;
        }catch(e){
            ST.autoDungeonIdlePaused=false;
            log('DEBUG','自动秘境停止挂机失败',e?.message||String(e));
            return false;
        }
    }
    async function resumeIdleAfterAutoDungeon(options={}){
        if(!ST.autoDungeonIdlePaused)return false;
        ST.autoDungeonIdlePaused=false;
        const mergedOptions={
            successStatusText:'自动秘境结束，已恢复挂机',
            errorStatusText:'自动秘境结束，但恢复挂机失败：%ERROR%',
            ...options
        };
        await resumeIdleForAutomation('自动秘境',mergedOptions);
        return true;
    }

    async function runAutoGather(){
        if(ST.gatherRun)return;
        ST.gatherRun=true;
        ST.gatherToken+=1;
        const tokenRef=ST.gatherToken;
        updateAutoGatherBtn();
        setAutoGatherStatus('准备中');
        log('INFO','自动采集','开始');
        try{
            const spots=await collectGatherSpots();
            setAutoGatherStatus(`扫描资源 ${spots.length}`);
            const states=await loadGatherSpotStates(spots,(current,total)=>{
                setAutoGatherStatus(`扫描房间 ${current}/${total}`);
            });
            const groups=buildGatherGroups(spots,states);
            if(!groups.length){
                setAutoGatherStatus('0/0 结束');
                log('INFO','自动采集','0/0 结束');
                return;
            }
            for(let idx=0;idx<groups.length&&ST.gatherRun&&tokenRef===ST.gatherToken;idx++){
                await processGatherGroup(groups[idx],idx+1,groups.length,tokenRef);
            }
            if(ST.gatherRun&&tokenRef===ST.gatherToken){
                log('INFO','自动采集收尾','开始执行采集完成后的任务结算');
                await settleGatherCompletionTasks(tokenRef);
                setAutoGatherStatus('全部完成');
                log('INFO','自动采集','结束');
            }
        }catch(e){
            setAutoGatherStatus(`异常：${e?.message||e}`);
            log('ERROR','自动采集异常',e?.message||String(e));
        }finally{
            if(tokenRef===ST.gatherToken){
                ST.gatherRun=false;
                updateAutoGatherBtn();
            }
        }
    }

    async function runAutoCombat(){
        if(ST.combatRun)return;
        try{
            await stopIdleForAutomation('自动打怪');
        }catch(e){
            log('DEBUG','自动打怪停止挂机失败',e?.message||String(e));
        }
        ST.combatRun=true;
        ST.combatToken+=1;
        ST.combatProgressIndex=0;
        ST.combatProgressTotal=0;
        const tokenRef=ST.combatToken;
        updateAutoCombatBtn();
        setAutoCombatStatus('准备中');
        log('INFO','自动打怪','开始');
        try{
            const remainingMap=await loadCurrentTaskMonsterRemainingMap();
            const monsterSpots=collectTaskMonsterSpots(await collectMonsterSpots(),remainingMap);
            if(!monsterSpots.length){
                setAutoCombatStatus('0/0 结束');
                log('INFO','自动打怪','0/0 结束');
                await resumeIdleForAutomation('自动打怪',{
                    successStatusText:'自动打怪未找到任务，已恢复挂机',
                    errorStatusText:'自动打怪未找到任务，但恢复挂机失败：%ERROR%'
                });
                return;
            }
            for(let idx=0;idx<monsterSpots.length&&ST.combatRun&&tokenRef===ST.combatToken;idx++){
                await processCombatSpot(monsterSpots[idx],idx+1,monsterSpots.length,tokenRef);
            }
            if(ST.combatRun&&tokenRef===ST.combatToken){
                await settleRecurringTasks();
                setAutoCombatStatus('全部完成');
                log('INFO','自动打怪','结束');
                await resumeIdleForAutomation('自动打怪',{
                    successStatusText:'自动打怪完成，已恢复挂机',
                    errorStatusText:'自动打怪完成，但恢复挂机失败：%ERROR%'
                });
            }
        }catch(e){
            setAutoCombatStatus(`异常：${e?.message||e}`);
            log('ERROR','自动打怪异常',e?.message||String(e));
        }finally{
            if(tokenRef===ST.combatToken){
                ST.combatRun=false;
                updateAutoCombatBtn();
            }
        }
    }

    async function runAutoDungeon(){
        if(ST.autoDungeonRun)return;
        const selectionValue=getAutoDungeonSelectionValue();
        const parsed=parseAutoDungeonSelection(selectionValue);
        const matchedLabel=dungeonOptionsCache.find((item)=>item.value===selectionValue)?.label||selectionValue;
        if(!parsed){
            setAutoDungeonStatus('请选择秘境');
            log('WARN','自动秘境','未选择秘境');
            return;
        }
        const selection={...parsed,label:matchedLabel};
        await pauseIdleForAutoDungeon();
        resetAutoDungeonSessionCounters();
        ST.autoDungeonRun=true;
        ST.autoDungeonToken+=1;
        const tokenRef=ST.autoDungeonToken;
        updateAutoDungeonBtn();
        setAutoDungeonStatus(`准备中 | ${selection.label}`);
        log('INFO','自动秘境',`开始 | ${selection.label}`);
        try{
            while(ST.autoDungeonRun&&tokenRef===ST.autoDungeonToken){
                await tickAutoDungeon(tokenRef,selection);
                if(!ST.autoDungeonRun||tokenRef!==ST.autoDungeonToken)break;
                await wait(T5);
            }
        }catch(e){
            setAutoDungeonStatus(`异常：${e?.message||e}`);
            log('ERROR','自动秘境异常',e?.message||String(e));
        }finally{
            if(tokenRef===ST.autoDungeonToken){
                ST.autoDungeonRun=false;
                updateAutoDungeonBtn();
            }
            await resumeIdleAfterAutoDungeon({
                successStatusText:'自动秘境结束，已恢复挂机',
                errorStatusText:'自动秘境结束，但恢复挂机失败：%ERROR%'
            });
        }
    }

    function toggleAutoGather(){
        if(ST.gatherRun){
            stopAutoGather();
            return;
        }
        runAutoGather();
    }

    function toggleAutoCombat(){
        if(ST.combatRun){
            stopAutoCombat();
            return;
        }
        runAutoCombat();
    }

    function toggleAutoDungeon(){
        if(ST.autoDungeonRun){
            stopAutoDungeon();
            return;
        }
        runAutoDungeon();
    }

    async function settleTaskCategory(category){
        let submitted=0;
        let claimed=0;
        for(let round=0;round<3;round++){
            const tasks=await taskOverview(category);
            let acted=false;
            for(const task of tasks){
                const taskId=String(task?.id||'').trim();
                const npcId=String(task?.giverNpcId||'').trim();
                const status=String(task?.status||'').trim();
                if(!taskId)continue;
                if(status==='turnin'&&npcId){
                    await submitTaskToNpc(npcId,taskId);
                    submitted++;
                    acted=true;
                    continue;
                }
                if(status==='claimable'){
                    await claimTaskReward(taskId);
                    claimed++;
                    acted=true;
                }
            }
            if(!acted)break;
        }
        return{submitted,claimed};
    }

    function findTaskByTitle(tasks,title){
        const target=String(title||'').trim();
        if(!target)return null;
        for(const task of(Array.isArray(tasks)?tasks:[])){
            if(String(task?.title||'').trim()===target)return task;
        }
        return null;
    }

    async function settleDailySignInLegacy(source){
        if(!token()){
            log('DEBUG','每日打卡跳过',`${source}:未登录`);
            return{signed:false,skipped:true};
        }
        try{
            const overview=await signInOverview();
            if(overview?.signedToday){
                log('DEBUG','每日打卡跳过',`${source}:今日已打卡`);
                return{signed:false,skipped:true};
            }
            const result=await doSignInAction();
            const reward=Math.max(0,i(result?.data?.reward,0));
            const detail=reward>0?`：+${reward}灵石`:'';
            setStatus(`每日打卡完成${detail}`);
            log('INFO','每日打卡成功',`${source}${reward>0?` reward=${reward}`:''}`);
            return{signed:true,skipped:false,reward};
        }catch(e){
            const msg=String(e?.message||e||'');
            if(/今日已签到|今日已打卡/.test(msg)){
                log('DEBUG','每日打卡跳过',`${source}:今日已打卡`);
                return{signed:false,skipped:true};
            }
            log('ERROR','每日打卡失败',`${source}:${msg}`);
            return{signed:false,skipped:false,error:msg};
        }
    }

    async function settleRecurringTasksLegacy(){
        const daily=await settleTaskCategory('daily');
        const event=await settleTaskCategory('event');
        const submitted=daily.submitted+event.submitted;
        const claimed=daily.claimed+event.claimed;
        const detail=`提交${submitted} 领取${claimed}`;
        setStatus(`任务结算 ${detail}`);
        log('INFO','任务结算',detail);
        const signIn=await settleDailySignIn('自动采集任务结算后');
        return{submitted,claimed,signIn};
    }

    async function settleGatherCompletionTasks(tokenRef){
        setAutoGatherStatus('收尾中：任务结算');
        log('INFO','采集完成结算',`token=${tokenRef}`);
        return settleRecurringTasks();
    }

    async function combo(c,source){const out=[];let disCount=0,useCount=0;const shareBag=c.enableAutoDisassemble&&c.enableAutoUse;const sharedItems=shareBag?await getBagItemsSnapshot(null):null;if(c.enableAutoDisassemble){try{const r=await doDis(c,sharedItems);disCount=i(r?.count,0);out.push(`分解${disCount}`);}catch(e){out.push(`分解失败:${e?.message||e}`);}}
                                   if(c.enableAutoUse){try{const r=await doUse(c,shareBag?sharedItems:null);useCount=i(r?.count,0);out.push(`使用${useCount}`);}catch(e){out.push(`使用失败:${e?.message||e}`);}}
                                   if(out.length){setStatus(`(${source}) ${out.join('，')}`);log('INFO',source,out.join('，'));upd();}return{disCount,useCount};}

    async function mailCycle(c){
        const snapshot=await getMailSnapshot();
        const ms=[...snapshot.unclaimed];
        setUnclaimedMail(ms.length);
        if(!ms.length){
            if(snapshot.deletable.length){
                let deleted=0;
                try{
                    const clean=await cleanupReadMailsByOneClick(snapshot.deletable);
                    deleted=i(clean?.deleted,0);
                    if(deleted>0){
                        setStatus(`邮箱清理完成：删除已读邮件 ${deleted} 封`);
                        log('INFO','邮箱清理完成',`deleted=${deleted}`);
                    }
                }catch(e){
                    log('ERROR','邮箱清理失败',e?.message||String(e));
                }
                const pending=Math.max(0,snapshot.deletable.length-deleted);
                return{idle:pending<=0};
            }
            return{idle:true};
        }
        let cm=0;
        let ci=0;
        let bagRecoveryTriggered=false;
        let bagRecoveryCount=0;
        for(let idx=0;idx<ms.length;){
            if(!ST.run||!cfg().enableAutoClaimMail)break;
            const m=ms[idx];
            const id=m?.id;
            if(!id){
                idx++;
                continue;
            }
            try{
                await claim(id);
                cm++;
                bagRecoveryCount=0;
                ci+=countMailItemRewards(m);
                setStatus(`邮件领取中：已领取 ${cm} 封`);
                idx++;
            }catch(e){
                if(!bagFull(e)){
                    log('ERROR','领取邮件失败',e?.message||String(e));
                    idx++;
                    continue;
                }
                bagRecoveryTriggered=true;
                bagRecoveryCount++;
                if(bagRecoveryCount>MAX_MAIL_BAG_RECOVER_RETRY){
                    log('WARN','邮件领取触发背包满','自动清理已达上限，需手动处理');
                    return{idle:false,manualBagFull:true};
                }
                const round=`第${bagRecoveryCount}轮`;
                setStatus(`邮件领取暂停：背包满，${round}清理中`);
                log('WARN','邮件领取触发背包满',`${round} | ${e?.message||String(e)}`);
                await combo(c,`邮件背包满处理 ${round}`);
            }
        }
        if(cm>0)add(K.M,cm);
        if(ci>0)add(K.MI,ci);
        const nextSnapshot=await getMailSnapshot();
        const left=nextSnapshot.unclaimed;
        setUnclaimedMail(left.length);
        let idle=left.length<=0;
        if(idle&&nextSnapshot.deletable.length){
            let deleted=0;
            try{
                const clean=await cleanupReadMailsByOneClick(nextSnapshot.deletable);
                deleted=i(clean?.deleted,0);
                if(deleted>0){
                    setStatus(`邮箱清理完成：删除已读邮件 ${deleted} 封`);
                    log('INFO','邮箱清理完成',`deleted=${deleted}`);
                }
            }catch(e){
                log('ERROR','邮箱清理失败',e?.message||String(e));
            }
            const pending=Math.max(0,nextSnapshot.deletable.length-deleted);
            idle=idle&&pending<=0;
        }else if(!idle&&bagRecoveryTriggered){
            setStatus(`背包清理完成，剩余 ${left.length} 封待处理，60秒后重试`);
        }
        log('INFO','邮件领取轮次完成',`claimedMail=${cm}, remain=${left.length}`);
        return{idle};
    }

    function stopAutoSectShopFragment(){
        if(ST.sectShopTimer){
            clearTimeout(ST.sectShopTimer);
            ST.sectShopTimer=null;
        }
        ST.autoSectShopRun=false;
    }
    function scheduleNextAutoSectShopFragment(delayMs){
        if(ST.sectShopTimer)clearTimeout(ST.sectShopTimer);
        ST.sectShopTimer=setTimeout(()=>{
            ST.sectShopTimer=null;
            if(ST.run&&cfg().enableAutoSectShopFragment)startAutoSectShopFragment('scheduled');
        },Math.max(T5,delayMs));
    }
    async function startAutoSectShopFragment(source='manual'){
        if(!ST.run||!cfg().enableAutoSectShopFragment||ST.autoSectShopRun)return;
        ST.autoSectShopRun=true;
        try{
            const result=await settleSectShopFragmentPurchase(source);
            if(result?.purchased){
                const donateText=result.donated?`，已先捐献${SECT_FRAGMENT_DONATE_AMOUNT}灵石`:'';
                setStatus(`宗门残页购买成功：${result.itemName} x${result.count}${donateText}`);
                log('INFO','宗门残页',`购买成功 ${result.itemName} x${result.count}${donateText}`);
            }else if(result?.skipped){
                setStatus(`宗门残页已处理：${result.reason||'skip'}`);
                log('INFO','宗门残页',`跳过 ${result.reason||'skip'}`);
            }else if(result?.error){
                setStatus(`宗门残页处理失败：${result.error}`);
                log('ERROR','宗门残页',result.error);
            }
        }catch(e){
            const msg=String(e?.message||e||'');
            setStatus(`宗门残页处理失败：${msg}`);
            log('ERROR','宗门残页',msg);
        }finally{
            ST.autoSectShopRun=false;
            if(ST.run&&cfg().enableAutoSectShopFragment){
                const today=todayDateKey();
                const delay=getSectFragmentDoneDate()===today?nextDailyResetDelayMs(1):T180;
                scheduleNextAutoSectShopFragment(delay);
            }
        }
    }
    function stopAutoSignIn(){
        if(ST.autoSignInTimer){
            clearTimeout(ST.autoSignInTimer);
            ST.autoSignInTimer=null;
        }
        ST.autoSignInRun=false;
    }
    async function startAutoSignIn(source='manual'){
        if(!ST.run||!cfg().enableAutoSignIn||ST.autoSignInRun)return;
        ST.autoSignInRun=true;
        try{
            const result=await settleDailySignIn(source);
            if(result?.signed){
                setStatus('自动签到已处理');
            }else if(result?.error){
                setStatus(`自动签到失败：${result.error}`);
            }
        }catch(e){
            const msg=String(e?.message||e||'');
            setStatus(`自动签到异常：${msg}`);
            log('ERROR','自动签到',msg);
        }finally{
            ST.autoSignInRun=false;
            if(ST.autoSignInTimer){
                clearTimeout(ST.autoSignInTimer);
                ST.autoSignInTimer=null;
            }
            if(ST.run&&cfg().enableAutoSignIn){
                ST.autoSignInTimer=setTimeout(()=>{
                    if(ST.run&&cfg().enableAutoSignIn)startAutoSignIn('scheduled');
                },Math.max(T5,nextDailyResetDelayMs(1)));
            }
        }
    }
    function stopAutoMonthCard(){
        if(ST.autoMonthCardTimer){
            clearTimeout(ST.autoMonthCardTimer);
            ST.autoMonthCardTimer=null;
        }
        ST.autoMonthCardRun=false;
    }
    async function startAutoMonthCard(source='manual'){
        if(!ST.run||!cfg().enableAutoMonthCard||ST.autoMonthCardRun)return;
        ST.autoMonthCardRun=true;
        try{
            const result=await settleMonthCardSignIn(source);
            if(result?.signed){
                setStatus('自动月卡领取已处理');
            }else if(result?.error){
                setStatus(`自动月卡领取失败：${result.error}`);
            }
        }catch(e){
            const msg=String(e?.message||e||'');
            setStatus(`自动月卡领取异常：${msg}`);
            log('ERROR','自动月卡领取',msg);
        }finally{
            ST.autoMonthCardRun=false;
            if(ST.autoMonthCardTimer){
                clearTimeout(ST.autoMonthCardTimer);
                ST.autoMonthCardTimer=null;
            }
            if(ST.run&&cfg().enableAutoMonthCard){
                ST.autoMonthCardTimer=setTimeout(()=>{
                    if(ST.run&&cfg().enableAutoMonthCard)startAutoMonthCard('scheduled');
                },Math.max(T5,nextDailyResetDelayMs(1)));
            }
        }
    }
    function stopAutoWander(){
        if(ST.autoWanderTimer){
            clearTimeout(ST.autoWanderTimer);
            ST.autoWanderTimer=null;
        }
        ST.autoWanderRun=false;
    }
    function scheduleNextAutoWander(delayMs=T60){
        if(ST.autoWanderTimer)clearTimeout(ST.autoWanderTimer);
        ST.autoWanderTimer=setTimeout(()=>{
            ST.autoWanderTimer=null;
            if(ST.run&&cfg().enableAutoWander)startAutoWander('scheduled');
        },Math.max(T5,delayMs));
    }
    async function settleAutoWanderOnce(source='auto'){
        const overview=await get(WANDER_OVERVIEW_PATH);
        const job=overview?.currentGenerationJob||null;
        const episode=overview?.currentEpisode||null;
        if(overview?.aiAvailable===false){
            return{acted:false,reason:'ai-unavailable',delayMs:T180};
        }
        if(job?.status==='pending'){
            return{acted:false,reason:'pending',delayMs:T5};
        }
        if(overview?.hasPendingEpisode&&episode?.id){
            const options=Array.isArray(episode.options)?episode.options:[];
            if(options.length<=0){
                return{acted:false,reason:'pending-without-options',delayMs:T5};
            }
            const optionIndex=options.length?Math.max(0,i(options[0]?.index,0)):0;
            await post(WANDER_CHOOSE_PATH,{episodeId:String(episode.id),optionIndex});
            return{acted:true,action:`choose:${optionIndex}`,delayMs:T5,source};
        }
        if(overview?.canGenerate&&!overview?.isCoolingDown){
            await post(WANDER_GENERATE_PATH,{});
            return{acted:true,action:'generate',delayMs:T5,source};
        }
        if(overview?.isCoolingDown){
            const remainMs=Math.max(0,i(overview?.cooldownRemainingSeconds,0))*1000+1000;
            return{acted:false,reason:'cooldown',delayMs:Math.max(T30,Math.min(1800000,remainMs))};
        }
        return{acted:false,reason:'idle',delayMs:T60};
    }
    async function startAutoWander(source='manual'){
        if(!ST.run||!cfg().enableAutoWander||ST.autoWanderRun)return;
        ST.autoWanderRun=true;
        let nextDelay=T60;
        try{
            const result=await settleAutoWanderOnce(source);
            nextDelay=Math.max(T5,i(result?.delayMs,T60));
            if(result?.acted){
                const msg=result?.action==='generate'?'已发起新奇遇':'已自动选择奇遇选项';
                setStatus(`自动奇遇：${msg}`);
                log('INFO','自动奇遇',`${msg} | source=${source}`);
            }
        }catch(e){
            const msg=String(e?.message||e||'');
            setStatus(`自动奇遇失败：${msg}`);
            log('ERROR','自动奇遇',msg);
            nextDelay=T60;
        }finally{
            ST.autoWanderRun=false;
            if(ST.run&&cfg().enableAutoWander){
                scheduleNextAutoWander(nextDelay);
            }
        }
    }
    function startMail(){if(!ST.run||ST.mailRun||!cfg().enableAutoClaimMail)return;ST.mailRun=true;ST.mailToken+=1;const tokenRef=ST.mailToken;if(ST.mt)clearTimeout(ST.mt);ST.mt=null;
                         (async()=>{try{while(ST.run&&cfg().enableAutoClaimMail&&tokenRef===ST.mailToken){const c=cfg();const r=await ST.q.en('mail-cycle',async()=>mailCycle(c));upd();requestInformationMonitorRefresh('mail-cycle');if(!ST.run||!cfg().enableAutoClaimMail||tokenRef!==ST.mailToken)break;if(r.idle){if(r.manualBagFull){setStatus('背包已满需手动清理，60秒后重试邮件');log('WARN','邮件巡检等待','背包满且本轮0封成功领取，已转为60秒巡检');}else{setStatus('邮件已清空，60秒后检查新邮件');log('INFO','邮件全部处理完毕，进入巡检等待');}if(tokenRef===ST.mailToken){ST.mailRun=false;ST.mt=setTimeout(()=>{if(ST.run&&cfg().enableAutoClaimMail&&tokenRef===ST.mailToken)startMail();},T60);}return;}}}catch(e){setStatus(`邮件循环异常：${e?.message||e}`);log('ERROR','邮件循环异常',e?.message||String(e));}if(tokenRef===ST.mailToken)ST.mailRun=false;})();}

    function hasDisassembleEnabled(c){return !!(c.enableAutoDisassemble||c.autoDecomposeByNameEnabled);}
    function scheduleDis(immediate=false){if(ST.dt)clearTimeout(ST.dt);if(!ST.run)return;ST.dt=setTimeout(async()=>{const c=cfg();if(!ST.run||!hasDisassembleEnabled(c))return;await ST.q.en('disassemble-tick',async()=>{try{const bagItems=c.enableAutoUse?await getBagItemsSnapshot(null):null;const r=await doDis(c,bagItems);setStatus(`自动分解完成：${r.count} 件`);upd();if(c.enableAutoUse){const u=await doUse(c,bagItems);setStatus(`分解后自动使用：${u.count} 件`);upd();}}catch(e){setStatus(`自动分解失败：${e?.message||e}`);log('ERROR','自动分解失败',e?.message||String(e));}});if(ST.run)scheduleDis(false);},immediate?0:T30);}
    function scheduleUse(immediate=false){if(ST.ut)clearTimeout(ST.ut);if(!ST.run)return;ST.ut=setTimeout(async()=>{const c=cfg();if(!ST.run||!c.enableAutoUse||c.enableAutoDisassemble)return;await ST.q.en('use-tick',async()=>{try{const r=await doUse(c);setStatus(`自动使用完成：${r.count} 件`);upd();}catch(e){setStatus(`自动使用失败：${e?.message||e}`);log('ERROR','自动使用失败',e?.message||String(e));}});if(ST.run)scheduleUse(false);},immediate?0:T30);}

    function refresh(immediate=false){stopTimers();if(!ST.run)return;const c=cfg();if(hasDisassembleEnabled(c))scheduleDis(immediate);if(c.enableAutoUse&&!hasDisassembleEnabled(c))scheduleUse(immediate);if(c.enableAutoClaimMail)startMail();if(c.enableAutoSignIn)startAutoSignIn('refresh');if(c.enableAutoMonthCard)startAutoMonthCard('refresh');if(c.enableAutoWander)startAutoWander('refresh');if(c.enableAutoSectShopFragment)startAutoSectShopFragment('refresh');if(c.enableAutoDungeon)runAutoDungeon();}

    function updateStartBtn(){const b=document.getElementById('jz2_start');if(!b)return;if(ST.run){b.textContent='停止';b.style.background='var(--danger,#ff4d4f)';b.style.borderColor='var(--danger,#ff4d4f)';}else{b.textContent='启动';b.style.background='var(--primary,#1677ff)';b.style.borderColor='var(--primary,#1677ff)';}}
    function updateToggleBtn(id,enabled,enableText,disableText){const b=document.getElementById(id);if(!b)return;b.textContent=enabled?enableText:disableText;b.style.background=enabled?'#16a34a':'#f59e0b';b.style.borderColor=enabled?'#16a34a':'#f59e0b';b.style.color='#fff';}
    function updateSectShopFragmentBtn(){const b=document.getElementById('jz2_toggle_sect_fragment');if(!b)return;const c=cfg();b.textContent=c.enableAutoSectShopFragment?'宗门残页:启用中':'宗门残页:未启用';b.style.background=c.enableAutoSectShopFragment?'#16a34a':'#f59e0b';b.style.borderColor=c.enableAutoSectShopFragment?'#16a34a':'#f59e0b';b.style.color='#fff';}
    function updateFeatureBtns(){const c=cfg();updateToggleBtn('jz2_toggle_dis_eq',c.enableAutoDisassemble,'装备分解:启用中','装备分解:未启用');updateToggleBtn('jz2_toggle_dis_item',c.autoDecomposeByNameEnabled,'物品分解:启用中','物品分解:未启用');updateToggleBtn('jz2_toggle_use',c.enableAutoUse,'礼盒开启:启用中','礼盒开启:未启用');updateToggleBtn('jz2_toggle_mail',c.enableAutoClaimMail,'收取邮件:启用中','收取邮件:未启用');updateToggleBtn('jz2_toggle_wander',c.enableAutoWander,'自动奇遇:启用中','自动奇遇:未启用');updateSectShopFragmentBtn();}
    function setLogPanelVisible(visible){UI.logPanelVisible=!!visible;const wrap=document.getElementById('jz2_log_wrap');if(wrap)wrap.style.display=UI.logPanelVisible?'block':'none';const btn=document.getElementById('jz2_toggle_log_panel');if(btn)btn.textContent=UI.logPanelVisible?'隐藏调试日志':'输出调试日志';if(UI.logPanelVisible)renderLogs();}
    function runFeatureOnceOnToggle(key,label){
        if(!ST.run)return;
        const c=cfg();
        if(key==='enableAutoDisassemble'||key==='autoDecomposeByNameEnabled'){
            executeInstantAction(label,key,()=>doDis(c));
            return;
        }
        if(key==='enableAutoUse'){
            executeInstantAction(label,key,()=>doUse(c));
            return;
        }
        if(key==='enableAutoClaimMail'){
            startMail();
            return;
        }
        if(key==='enableAutoSignIn'){
            setStatus('自动签到开始处理...');
            startAutoSignIn('toggle');
            return;
        }
        if(key==='enableAutoMonthCard'){
            setStatus('自动月卡开始处理...');
            startAutoMonthCard('toggle');
            return;
        }
        if(key==='enableAutoWander'){
            setStatus('自动奇遇开始处理...');
            startAutoWander('toggle');
            return;
        }
        if(key==='enableAutoSectShopFragment'){
            setStatus('宗门残页开始处理...');
            startAutoSectShopFragment('toggle');
        }
    }
    function toggleFeature(key,label){const c=cfg();c[key]=!c[key];save(c);updateFeatureBtns();updateRuntimeSummary();log('INFO',`${label}${c[key]?'已启用':'已停用'}`);if(ST.run&&c[key])runFeatureOnceOnToggle(key,label);if(ST.run)refresh(false);}
    function getTianPolicyHint(on){return{txt:on?'保留策略已激活':'未勾选“天”，策略仅保存不生效',color:on?'#16a34a':'#64748b'};}
    function updateRuntimeSummary(){const c=cfg();const rt=document.getElementById('jz2_runtime_text');const dot2=document.getElementById('jz2_runtime_dot2');const runTxt=ST.run?'运行中':'已停止';const idleTxt=ST.idleStateKnown?(ST.idleStateRunning?'挂机中':'未挂机'):'挂机未知';const sum=`${runTxt} | ${idleTxt} | 装备:${c.enableAutoDisassemble?'开':'关'} | 物品:${c.autoDecomposeByNameEnabled?'开':'关'} | 礼盒:${c.enableAutoUse?'开':'关'} | 邮件:${c.enableAutoClaimMail?'开':'关'} | 奇遇:${c.enableAutoWander?'开':'关'} | 宗门:${c.enableAutoSectShopFragment?'开':'关'} | 秘境:${c.enableAutoDungeon?'开':'关'}`;if(rt)rt.textContent=sum;if(dot2)dot2.style.background=ST.run?'#2ea043':'#9aa4b2';}
    function bindThresholdSlider(id,txtId,root=document){const s=root.querySelector(`#${id}`);const t=root.querySelector(`#${txtId}`);if(!s||!t)return;const sync=()=>{t.textContent=`${Math.max(0,Math.min(100,Number(s.value)||0)).toFixed(0)}%`;};if(s.dataset.jz2Bound!=='1'){s.addEventListener('input',sync);s.addEventListener('change',sync);s.dataset.jz2Bound='1';}sync();}
    function updateTianPolicyHint(){const h=document.getElementById('jz2_tian_hint');if(!h)return;const on=!!document.getElementById('jz2_q_t')?.checked;const hint=getTianPolicyHint(on);h.textContent=hint.txt;h.style.color=hint.color;}
    function syncQualityPills(){QUALITY_IDS.forEach(id=>{const input=document.getElementById(id);const lb=input?.closest('label');if(lb)lb.classList.toggle('on',!!input.checked);});updateTianPolicyHint();}
    function readQualityFromUI(){return{黄:!!document.getElementById('jz2_q_h')?.checked,玄:!!document.getElementById('jz2_q_x')?.checked,地:!!document.getElementById('jz2_q_d')?.checked,天:!!document.getElementById('jz2_q_t')?.checked};}
    /** 从 UI 读取 3 行关键词配置，保持与 cfg() 同样的归一化结果。 */
    function readKeepKeywordRowsFromUI(){const rows=[];for(let idx=0;idx<KEEP_KEYWORD_ROW_COUNT;idx++){rows.push({name:String(document.getElementById(`jz2_keep_name_keywords_${idx}`)?.value||''),affix:String(document.getElementById(`jz2_keep_affix_keywords_${idx}`)?.value||'')});}return normalizeKeywordRows(rows);}
    function canStartAnyFeature(c){return[hasDisassembleEnabled(c),c.enableAutoUse,c.enableAutoClaimMail,c.enableAutoSignIn,c.enableAutoMonthCard,c.enableAutoWander,c.enableAutoSectShopFragment,c.enableAutoDungeon].some(Boolean);}
    function markPageActivity(){
        ST.pageLastActiveAt=Date.now();
        ST.pageIdleFallbackTriggered=false;
    }
    function bindPageActivityListeners(){
        if(ST.pageIdleListenersBound)return;
        ST.pageIdleListenersBound=true;
        const onActivity=()=>markPageActivity();
        ['pointerdown','pointermove','keydown','wheel','touchstart','scroll'].forEach((evt)=>{
            window.addEventListener(evt,onActivity,{passive:true});
        });
        markPageActivity();
    }
    async function triggerPageIdleFallbackIfNeeded(){
        if(!ST.run)return;
        if(ST.pageIdleFallbackBusy)return;
        const c=cfg();
        if(c.enableAutoDungeon||ST.autoDungeonRun)return;
        const idleMs=Date.now()-Math.max(0,i(ST.pageLastActiveAt,0));
        if(idleMs<T180||ST.pageIdleFallbackTriggered)return;
        ST.pageIdleFallbackBusy=true;
        try{
            const sessionId=await resumeIdleForAutomation('页面静止保底挂机',{
                silent:true,
                successStatusText:'页面静止超过3分钟，已自动恢复挂机',
                errorStatusText:'页面静止超过3分钟，但自动恢复挂机失败：%ERROR%'
            });
            ST.pageIdleFallbackTriggered=true;
            void refreshIdleRunningState('poll');
            if(sessionId){
                log('INFO','页面静止保底挂机',`已触发自动挂机 session=${sessionId}`);
            }else{
                log('INFO','页面静止保底挂机','已触发自动挂机');
            }
        }catch(e){
            const msg=String(e?.message||e||'');
            log('ERROR','页面静止保底挂机',msg);
        }finally{
            ST.pageIdleFallbackBusy=false;
        }
    }
    function startPageIdleFallbackWatcher(){
        bindPageActivityListeners();
        if(ST.pageIdleWatchTimer){
            clearInterval(ST.pageIdleWatchTimer);
            ST.pageIdleWatchTimer=null;
        }
        ST.pageIdleWatchTimer=setInterval(()=>{
            void triggerPageIdleFallbackIfNeeded();
        },T5);
    }
    function resolveIdleRunningFromStatus(data){
        const session=data?.session??data??null;
        if(!session||typeof session!=='object')return false;
        const sid=String(session?.id??session?.sessionId??'').trim();
        if(!sid)return false;
        const status=String(session?.status||session?.state?.phase||'').toLowerCase();
        if(/ended|finished|completed|abandoned|stopped/.test(status))return false;
        return true;
    }
    function setIdleRunningState(running,known=true){
        ST.idleStateKnown=!!known;
        ST.idleStateRunning=!!running;
        updateRuntimeSummary();
    }
    async function refreshIdleRunningState(reason='poll'){
        try{
            const data=await get('/idle/status');
            setIdleRunningState(resolveIdleRunningFromStatus(data),true);
        }catch(e){
            if(reason==='init'){
                setIdleRunningState(false,false);
            }
            log('DEBUG','挂机状态同步失败',e?.message||String(e));
        }
    }
    function startIdleStateWatcher(){
        if(ST.idleStateWatchTimer){
            clearInterval(ST.idleStateWatchTimer);
            ST.idleStateWatchTimer=null;
        }
        ST.idleStateWatchTimer=setInterval(()=>{
            void refreshIdleRunningState('poll');
        },T15);
        void refreshIdleRunningState('init');
    }
    function bindModalClick(root,id,handler){root.querySelector(id)?.addEventListener('click',handler);}
    function executeInstantAction(label,key,runner){ST.q.en(`${key}-instant`,async()=>{try{const r=await runner();setStatus(`${label}立即执行：${r.count} 件`);upd();}catch(e){setStatus(`${label}立即执行失败：${e?.message||e}`);log('ERROR',`${label}立即执行失败`,e?.message||String(e));}});}

    function saveFromUI(){const c=cfg();
                          const prevTeamTarget=String(c.teamAutoTarget||'').trim();
                          c.qualities=readQualityFromUI();
                          c.keepSetOnly=!!document.getElementById('jz2_keep_set')?.checked;
                          c.keepRealmMin=String(document.getElementById('jz2_keep_realm')?.value||'');
                          c.keepAffixCountN=Math.max(0,i(document.getElementById('jz2_keep_n')?.value,0));
                          c.keepAffixTierMin=Math.max(0,i(document.getElementById('jz2_keep_tier')?.value,0));
                          c.keepAffixAttrPercent=Math.max(0,Math.min(100,f(document.getElementById('jz2_keep_attr')?.value,0)));
                          c.keepAffixSkillPercent=Math.max(0,Math.min(100,f(document.getElementById('jz2_keep_skill')?.value,0)));
                          c.keepKeywordRows=readKeepKeywordRowsFromUI();
                          c.keepNameKeywords='';
                          c.keepExcludeKeywords='';
                          c.autoDecomposeNames=String(document.getElementById('jz2_name')?.value||'');
                          c.autoUsePresets={lingshiBag:!!document.getElementById('jz2_use_ls')?.checked,baoshiBag:!!document.getElementById('jz2_use_bs')?.checked,giftBag:!!document.getElementById('jz2_use_gift')?.checked};c.autoUseNames=String(document.getElementById('jz2_use_name')?.value||'');
                          c.autoDungeonSelection=String(document.getElementById('jz2_auto_dungeon_select')?.value||'');
                          const nextTeamTarget=String(document.getElementById('jz2_team_target')?.value||'').trim();
                          c.teamAutoTarget=nextTeamTarget;
                          save(c);syncQualityPills();const at=document.getElementById('jz2_keep_attr_text');const st=document.getElementById('jz2_keep_skill_text');if(at)at.textContent=`${Math.max(0,Math.min(100,c.keepAffixAttrPercent)).toFixed(0)}%`;if(st)st.textContent=`${Math.max(0,Math.min(100,c.keepAffixSkillPercent)).toFixed(0)}%`;if(prevTeamTarget!==nextTeamTarget){setAutoTeamStatus(nextTeamTarget?`已更新目标玩家：${nextTeamTarget}`:'目标玩家已清空');updateTeamFlowButton();}log('INFO','配置已更新');if(ST.run)refresh(false);}

    function removeCompanionModal(){const modalEl=document.getElementById('jz2_modal');if(!modalEl)return;modalEl.remove();}
    /** 渲染 3 行装备/词条关键词输入区域，便于拓展行数时集中维护。 */
    function renderKeywordRowsMarkup(c){
        const rows=Array.isArray(c.keepKeywordRows)?c.keepKeywordRows:normalizeKeywordRows(c.keepKeywordRows);
        return rows.map((row,idx)=>{
            const nameId=`jz2_keep_name_keywords_${idx}`;
            const affixId=`jz2_keep_affix_keywords_${idx}`;
            return `
      <div class="jz2-keep-kw-row">
        <span class="jz2-keep-kw-row-badge">${idx+1}</span>
        <textarea id="${nameId}" rows="1" class="jz2-input-compact jz2-keep-name-box" style="font-size:11px;" placeholder="装备名关键词，留空则跳过本行">${row?.name||''}</textarea>
        <textarea id="${affixId}" rows="1" class="jz2-input-compact jz2-keep-affix-box" style="font-size:11px;" placeholder="词条关键词，逗号/回车分隔">${row?.affix||''}</textarea>
      </div>
    `;
  }).join('');
}
    function modal(){const c=cfg();const ov=document.createElement('div');ov.id='jz2_modal';ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10000;display:flex;align-items:center;justify-content:center;';
                     const pa=document.createElement('div');pa.style.cssText='--primary:#2f6fdb;--danger:#e5484d;width:860px;max-width:98vw;max-height:90vh;background:#f7f8fa;border-radius:14px;overflow:auto;display:flex;flex-direction:column;box-shadow:0 8px 24px rgba(0,0,0,.12);font-size:13px;line-height:1.55;color:#1f2937;';
                     pa.innerHTML=`
<style>
  .jz2-card{background:#fff;border:1px solid #dde3ea;border-radius:12px;box-shadow:0 1px 2px rgba(16,24,40,.03);}
  .jz2-btn{padding:6px 8px;border-radius:8px;border:1px solid #cfd7e3;background:#fff;color:#334155;cursor:pointer;font-weight:600;font-size:12px;white-space:nowrap;}
  .jz2-btn-primary{background:var(--primary);border-color:var(--primary);color:#fff;}
  .jz2-q{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:26px;border-radius:7px;border:1px solid #d0d7e2;cursor:pointer;user-select:none;font-weight:700;background:#fff;color:#64748b;}
  .jz2-q input{display:none;}
  .jz2-q-h.on{border-color:#d6b656;color:#b88900;background:rgba(214,182,86,0.14);}
  .jz2-q-x.on{border-color:#7a64d6;color:#5b45c8;background:rgba(122,100,214,0.14);}
  .jz2-q-d.on{border-color:#2db7a3;color:#1a8e7f;background:rgba(45,183,163,0.14);}
  .jz2-q-t.on{border-color:#ff7a45;color:#d94b1a;background:rgba(255,122,69,0.14);}
  .jz2-grid{display:grid;grid-template-columns:1.02fr .98fr;gap:12px;align-items:stretch;}
  .jz2-left-text{font-size:13px;font-weight:400;color:#334155;}
  .jz2-line-input{display:flex;align-items:center;gap:8px;white-space:nowrap;}
  .jz2-line-input textarea{min-width:0;}
  .jz2-keep-name-box{min-width:120px;flex:1 1 160px;}
  .jz2-keep-affix-box{min-width:160px;flex:2 1 220px;}
  .jz2-keep-kw-rows{flex:1;display:flex;flex-direction:column;gap:6px;min-width:0;}
  .jz2-keep-kw-row{display:flex;gap:6px;flex-wrap:wrap;align-items:flex-start;}
  .jz2-keep-kw-row-badge{flex:0 0 auto;width:22px;height:22px;border-radius:8px;background:#e2e8f0;color:#475569;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;}
  .jz2-keep-kw-row textarea{flex:1;min-width:120px;}
  .jz2-input-compact{height:30px;line-height:30px;box-sizing:border-box;border:1px solid #d0d7e2;border-radius:8px;background:#fff;padding:0 8px;}
  .jz2-select-compact{height:30px;padding:0 8px;border:1px solid #d0d7e2;border-radius:8px;background:#fff;min-width:148px;max-width:148px;}
  .jz2-toggle-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-bottom:10px;}
  .jz2-toggle-grid .jz2-btn{width:100%;}
  .jz2-tip-wrap{position:relative;display:inline-flex;align-items:center;gap:4px;}
  .jz2-tip-icon{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:999px;border:1px solid #94a3b8;color:#475569;font-size:11px;line-height:1;cursor:help;background:#fff;}
  .jz2-tip-pop{position:absolute;left:0;top:20px;z-index:5;width:300px;min-height:auto;max-width:75vw;padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#334155;box-shadow:0 6px 20px rgba(15,23,42,.12);font-size:12px;line-height:1.5;white-space:normal;word-break:break-word;opacity:0;visibility:hidden;transform:translateY(4px);transition:all .18s ease;}
  .jz2-tip-wrap:hover .jz2-tip-pop{opacity:1;visibility:visible;transform:translateY(0);}
  .jz2-monitor-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:10px;}
  .jz2-monitor-item{padding:8px 10px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;display:flex;flex-direction:column;gap:4px;}
  .jz2-monitor-label{font-size:12px;color:#64748b;}
  .jz2-monitor-value{font-size:14px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .jz2-monitor-items{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
  .jz2-monitor-item-count{display:flex;align-items:center;justify-content:space-between;border:1px solid #e2e8f0;border-radius:10px;padding:6px 10px;font-size:12px;background:#fff;min-height:36px;}
  .jz2-monitor-item-count strong{font-size:14px;color:#111827;}
  .jz2-monitor-footer{display:flex;align-items:center;justify-content:space-between;margin-top:10px;font-size:12px;color:#94a3b8;gap:8px;flex-wrap:wrap;}
  .jz2-monitor-error{color:#b91c1c;flex:1;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  @media (max-width:960px){
    .jz2-grid{grid-template-columns:1fr;}
    .jz2-monitor-grid,
    .jz2-monitor-items{grid-template-columns:1fr;}
  }
</style>
<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #dbe2ea;">
  <div style="display:flex;align-items:center;gap:10px;">
    <div style="font-size:18px;font-weight:800;">小伴侣 <span style="font-size:18px;color:#64748b;font-weight:600;">v1.2.5</span></div>
  </div>
  <button id="jz2_close" style="background:none;border:none;font-size:24px;color:#64748b;cursor:pointer;padding:0;line-height:1;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">&times;</button>
</div>
<div style="padding:14px 16px 16px;overflow-y:auto;flex:1;">
<div class="jz2-grid">
  <div style="display:flex;flex-direction:column;gap:12px;">
    <div class="jz2-card" style="padding:12px;">
      <div style="margin-bottom:10px;font-weight:700;color:#2f6fdb;font-size:16px;padding-bottom:8px;border-bottom:2px solid #2f6fdb;">装备分解</div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
        <span style="font-weight:600;">品阶筛选：</span>
        <label class="jz2-q jz2-q-h ${c.qualities?.黄?'on':''}"><input id="jz2_q_h" type="checkbox" ${c.qualities?.黄?'checked':''}>黄</label>
        <label class="jz2-q jz2-q-x ${c.qualities?.玄?'on':''}"><input id="jz2_q_x" type="checkbox" ${c.qualities?.玄?'checked':''}>玄</label>
        <label class="jz2-q jz2-q-d ${c.qualities?.地?'on':''}"><input id="jz2_q_d" type="checkbox" ${c.qualities?.地?'checked':''}>地</label>
        <label class="jz2-q jz2-q-t ${c.qualities?.天?'on':''}"><input id="jz2_q_t" type="checkbox" ${c.qualities?.天?'checked':''}>天</label>
      </div>
      <label class="jz2-left-text" style="display:flex;align-items:center;gap:6px;margin-bottom:8px;"><input id="jz2_keep_set" type="checkbox" ${c.keepSetOnly?'checked':''}> 天品只保留套装 <span id="jz2_tian_hint" style="font-size:12px;color:${getTianPolicyHint(!!c.qualities?.天).color};">${getTianPolicyHint(!!c.qualities?.天).txt}</span></label>
      <div style="margin-bottom:8px;display:flex;align-items:center;gap:6px;flex-wrap:nowrap;white-space:nowrap;"><span class="jz2-left-text">保留境界门槛：</span><select id="jz2_keep_realm" class="jz2-select-compact"><option value="">不启用</option>${REALMS.map(r=>`<option value="${r}" ${c.keepRealmMin===r?'selected':''}>${r}</option>`).join('')}</select><span style="color:#64748b;font-size:12px;">低于该境界分解</span></div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:nowrap;margin-bottom:8px;" class="jz2-left-text">
      <span class="jz2-left-text">词条数≥</span><input id="jz2_keep_n" type="number" min="0" max="10" value="${c.keepAffixCountN}" style="width:64px;padding:6px;border:1px solid #d0d7e2;border-radius:8px;">
      <span class="jz2-left-text">Tier≥</span><input id="jz2_keep_tier" type="number" min="0" max="20" value="${Math.max(0,i(c.keepAffixTierMin,0))}" style="width:64px;padding:6px;border:1px solid #d0d7e2;border-radius:8px;">
      <span style="color:#64748b;font-size:12px;">满足阈值保留</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span class="jz2-left-text" style="min-width:70px;">属性阈值:</span><input id="jz2_keep_attr" type="range" min="0" max="100" value="${c.keepAffixAttrPercent}" style="flex:1;"><span id="jz2_keep_attr_text" style="min-width:42px;text-align:right;">0%</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="jz2-left-text" style="min-width:70px;">技能阈值:</span><input id="jz2_keep_skill" type="range" min="0" max="100" value="${c.keepAffixSkillPercent}" style="flex:1;"><span id="jz2_keep_skill_text" style="min-width:42px;text-align:right;">0%</span>
      </div>
      <div class="jz2-line-input" style="margin-top:8px;margin-bottom:8px;align-items:flex-start;flex-wrap:wrap;">
        <span class="jz2-left-text jz2-tip-wrap" style="min-width:84px;">保留关键字：<span class="jz2-tip-icon">?</span><span class="jz2-tip-pop">完成前面所有判断条件之后进入关键词过滤，不填则不筛选<br><br>例如：词条数-2，Tier-5，装备关键词-赤焰，词条关键词-生命上限，物防，法防<br>最终会保留包含至少2条T5关键词条且满足阈值的赤焰装备</span></span>
        <div class="jz2-keep-kw-rows">${renderKeywordRowsMarkup(c)}</div>
      </div>
      <div style="margin:12px 0 10px;font-weight:700;color:#2f6fdb;font-size:16px;padding-top:10px;border-top:1px solid #e2e8f0;">物品分解 / 礼盒开启</div>
      <div class="jz2-line-input" style="margin-bottom:8px;">
        <span class="jz2-left-text">物品分解：</span>
        <textarea id="jz2_name" rows="1" class="jz2-input-compact" style="flex:1;min-width:0;font-size:11px;" placeholder="支持模糊检索，逗号(,，)或回车分隔">${c.autoDecomposeNames||''}</textarea>
      </div>
      <div class="jz2-line-input" style="margin-bottom:6px;">
        <span class="jz2-left-text">礼盒开启：</span>
        <textarea id="jz2_use_name" rows="1" class="jz2-input-compact" style="flex:1;min-width:0;font-size:11px;" placeholder="支持模糊检索，逗号(,，)或回车分隔">${c.autoUseNames||''}</textarea>
      </div>
      <label class="jz2-left-text"><input id="jz2_use_ls" type="checkbox" ${c.autoUsePresets?.lingshiBag?'checked':''}> 灵石袋</label><label class="jz2-left-text" style="margin-left:10px;"><input id="jz2_use_bs" type="checkbox" ${c.autoUsePresets?.baoshiBag?'checked':''}> 宝石袋</label><label class="jz2-left-text" style="margin-left:10px;"><input id="jz2_use_gift" type="checkbox" ${c.autoUsePresets?.giftBag?'checked':''}> 礼包</label>
    </div>
    <div class="jz2-card" style="padding:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;font-weight:700;color:#2f6fdb;font-size:16px;padding-bottom:8px;border-bottom:2px solid #2f6fdb;">
        <span>自动秘境</span>
        <span id="jz2_auto_dungeon_status" style="flex:1;font-size:12px;font-weight:400;color:#64748b;line-height:1.4;min-height:18px;text-align:right;">空闲</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;min-width:0;">
        <button id="jz2_auto_dungeon_toggle" class="jz2-btn jz2-btn-primary" style="flex:0 0 auto;">自动秘境</button>
        <select id="jz2_auto_dungeon_select" class="jz2-select-compact" style="flex:1;min-width:0;max-width:none;"><option value="${c.autoDungeonSelection||''}">${c.autoDungeonSelection||'加载中...'}</option></select>
      </div>
      <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px;font-weight:700;color:#2f6fdb;font-size:16px;padding-bottom:8px;border-bottom:2px solid #2f6fdb;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            <span>自动组队</span>
            <span class="jz2-tip-wrap">
              <span class="jz2-tip-icon">?</span>
              <span class="jz2-tip-pop">自动组队说明：<br>• 每 10 秒检测体力与队伍状态，体力 ≥20 且不在队伍时会停止挂机并持续尝试加入指定小队；<br>• 体力不足时仅在脱离战斗或秘境战斗后才会自动退队并恢复挂机；<br>• 只有触发“体力不足且无战斗”后，该流程才会停止。</span>
            </span>
          </div>
          <span id="jz2_team_status" style="flex:1;font-size:12px;font-weight:400;color:#64748b;line-height:1.4;min-height:20px;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${TEAM_CTRL.status}</span>
        </div>
        <div class="jz2-line-input" style="gap:8px;align-items:center;margin-bottom:10px;flex-wrap:nowrap;white-space:normal;">
          <button id="jz2_team_apply_btn" class="jz2-btn jz2-btn-primary" style="flex:0 0 auto;">自动组队</button>
          <span class="jz2-left-text" style="min-width:64px;">目标玩家：</span>
          <input id="jz2_team_target" type="text" class="jz2-input-compact" style="flex:1 1 auto;min-width:200px;" placeholder="输入用户名，例如：素问" value="${c.teamAutoTarget||''}">
        </div>
      </div>
    </div>
  </div>
  <div style="display:flex;flex-direction:column;height:100%;">
    <div class="jz2-card" style="padding:12px;">
      <div style="font-weight:700;color:#2f6fdb;font-size:16px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #e2e8f0;">运行状态</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:10px;border:1px solid #dce4ee;border-radius:10px;background:#f8fafc;">
        <span id="jz2_runtime_dot2" style="width:12px;height:12px;border-radius:999px;background:#9aa4b2;"></span>
        <span id="jz2_runtime_text" style="font-size:12px;font-weight:700;line-height:1.25;">已停止 | 装备:关 | 物品:关 | 礼盒:关 | 邮件:关</span>
      </div>
      <div class="jz2-toggle-grid">
        <button id="jz2_toggle_dis_eq" class="jz2-btn">装备分解:未启用</button>
        <button id="jz2_toggle_dis_item" class="jz2-btn">物品分解:未启用</button>
        <button id="jz2_toggle_use" class="jz2-btn">礼盒开启:未启用</button>
        <button id="jz2_toggle_mail" class="jz2-btn">收取邮件:未启用</button>
        <button id="jz2_toggle_signin" class="jz2-btn">自动签到:未启用</button>
        <button id="jz2_toggle_monthcard" class="jz2-btn">自动月卡:未启用</button>
        <button id="jz2_toggle_wander" class="jz2-btn">自动奇遇:未启用</button>
        <button id="jz2_toggle_sect_fragment" class="jz2-btn">宗门残页:未启用</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;border-top:1px solid #e2e8f0;padding-top:10px;">
        <div style="padding-right:8px;border-right:1px solid #e2e8f0;min-width:0;">累计分解<br><b id="jz2_d" style="display:block;font-size:14px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">0</b></div>
        <div style="padding:0 8px;border-right:1px solid #e2e8f0;min-width:0;">累计使用<br><b id="jz2_u" style="display:block;font-size:14px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">0</b></div>
        <div style="padding:0 8px;border-right:1px solid #e2e8f0;min-width:0;">领取邮件<br><b id="jz2_m" style="display:block;font-size:14px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">0</b></div>
        <div style="padding-left:8px;min-width:0;">未领邮件<br><b id="jz2_um" style="display:block;font-size:14px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">0</b></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;">
          <button id="jz2_auto_gather_toggle" class="jz2-btn jz2-btn-primary">自动采集</button>
          <button id="jz2_auto_combat_toggle" class="jz2-btn jz2-btn-primary">自动打怪</button>
        </div>
        <div id="jz2_auto_action_status" style="min-width:0;flex:1;font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right;">采集：空闲 | 打怪：空闲</div>
      </div>
    </div>
    <div class="jz2-card" id="jz2_monitor_card" style="padding:12px;margin-top:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #e2e8f0;">
        <span style="font-weight:700;color:#2f6fdb;font-size:16px;">信息监控</span>
        <span id="jz2_monitor_status_text" style="font-size:12px;color:#64748b;">等待邮件巡检</span>
      </div>
      <div class="jz2-monitor-grid">
        <div class="jz2-monitor-item">
          <span class="jz2-monitor-label">功法研修冷却</span>
          <span class="jz2-monitor-value" id="jz2_monitor_research">--</span>
        </div>
        <div class="jz2-monitor-item">
          <span class="jz2-monitor-label">伙伴招募冷却</span>
          <span class="jz2-monitor-value" id="jz2_monitor_recruit">--</span>
        </div>
      </div>
      <div class="jz2-monitor-items">
        ${COMPANION_MONITOR_ITEMS.map(item=>`<div class="jz2-monitor-item-count"><span>${item.label}</span><strong id="jz2_monitor_item_${item.key}">--</strong></div>`).join('')}
      </div>
      <div class="jz2-monitor-footer">
        <span>上次更新：<b id="jz2_monitor_updated_at">--</b></span>
        <span class="jz2-monitor-error" id="jz2_monitor_error"></span>
      </div>
    </div>
    <div class="jz2-card" style="padding:12px;margin-top:12px;">
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">
        <button id="jz2_start" class="jz2-btn jz2-btn-primary">启动</button>
        <button id="jz2_reset" class="jz2-btn">重置统计</button>
        <div style="display:inline-flex;align-items:center;gap:6px;flex-wrap:nowrap;">
          <button id="jz2_log_clear" class="jz2-btn">清空日志</button>
          <div class="jz2-tip-wrap">
            <span class="jz2-tip-icon">?</span>
            <span class="jz2-tip-pop">分解与开礼盒间隔30s，邮件60s查询，自动删除已阅</span>
          </div>
        </div>
      </div>
      <div id="jz2_status_steps" style="padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;color:#334155;white-space:pre-wrap;line-height:1.6;height:104px;max-height:104px;overflow:auto;">空闲</div>
    </div>
    <div id="jz2_log_wrap" class="jz2-card" style="display:none;margin-top:auto;padding:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e2e8f0;">
        <div style="font-weight:700;color:#2f6fdb;font-size:16px;">运行日志</div>
        <div class="jz2-tip-wrap">
          <span class="jz2-tip-icon">?</span>
          <span class="jz2-tip-pop">日志提示：顶部工具栏的“输出调试日志”控制是否显示本面板；清空按钮也位于顶部。此处仅保留最近 ${MAX_LOG} 行，便于排查脚本行为。</span>
        </div>
      </div>
      <div id="jz2_log_view" style="white-space:pre-wrap;overflow:auto;border:1px solid #d0d7e2;border-radius:8px;background:#fff;color:#111827;padding:8px;font-family:Consolas,Monaco,monospace;font-size:12px;line-height:1.4;min-height:84px;max-height:120px;"></div>
      <div style="margin-top:6px;font-size:12px;color:#64748b;">日志保留最近 ${MAX_LOG} 行，可滚动查看历史。</div>
    </div>
  </div>
</div>
</div>`;
                 ov.appendChild(pa);ov.addEventListener('click',e=>{if(e.target===ov)removeCompanionModal();});
                 bindModalClick(pa,'#jz2_close',()=>removeCompanionModal());
                 bindModalClick(pa,'#jz2_start',()=>{setRunning(!ST.run);if(ST.run){const c2=cfg();if(!canStartAnyFeature(c2)){setStatus('总控已启动（静止3分钟保底挂机模式）');log('INFO','总控已启动','未启用其他功能，已进入静止保底挂机模式');}else{setStatus('总控已启动');log('INFO','总控已启动');refresh(true);}}else{stopTimers();ST.mailRun=false;setStatus('总控已停止');setAutoTeamStatus('总控已停止，自动组队待命');log('INFO','总控已停止');}updateStartBtn();updateRuntimeSummary();updateTeamFlowButton();});
                 bindModalClick(pa,'#jz2_reset',()=>{if(!confirm('确认重置所有累计统计吗？'))return;rst(K.D);rst(K.U);rst(K.M);rst(K.MI);resetIdleSpirit();upd();renderIdleSpiritTooltip(idleTooltipHovering);setStatus('统计已重置');log('INFO','统计已重置');});
                 bindModalClick(pa,'#jz2_log_clear',()=>{UI.logs=[];renderLogs();log('INFO','日志已清空');});
                 bindModalClick(pa,'#jz2_toggle_dis_eq',()=>toggleFeature('enableAutoDisassemble','装备分解'));
                 bindModalClick(pa,'#jz2_toggle_dis_item',()=>toggleFeature('autoDecomposeByNameEnabled','物品分解'));
                 bindModalClick(pa,'#jz2_toggle_use',()=>toggleFeature('enableAutoUse','礼盒开启'));
                 bindModalClick(pa,'#jz2_toggle_mail',()=>toggleFeature('enableAutoClaimMail','收取邮件'));
                 bindModalClick(pa,'#jz2_toggle_signin',()=>toggleFeature('enableAutoSignIn','自动签到'));
                 bindModalClick(pa,'#jz2_toggle_monthcard',()=>toggleFeature('enableAutoMonthCard','自动月卡'));
                 bindModalClick(pa,'#jz2_toggle_wander',()=>toggleFeature('enableAutoWander','自动奇遇'));
                 bindModalClick(pa,'#jz2_toggle_sect_fragment',()=>toggleFeature('enableAutoSectShopFragment','宗门残页'));
                 bindModalClick(pa,'#jz2_auto_gather_toggle',()=>toggleAutoGather());
                 bindModalClick(pa,'#jz2_auto_combat_toggle',()=>toggleAutoCombat());
                 bindModalClick(pa,'#jz2_auto_dungeon_toggle',()=>toggleFeature('enableAutoDungeon','自动秘境'));
                 bindModalClick(pa,'#jz2_team_apply_btn',()=>startTeamAutoFlow());
                 pa.querySelectorAll('input,select,textarea').forEach(el=>{el.addEventListener('change',saveFromUI);if(el.tagName==='TEXTAREA')el.addEventListener('blur',saveFromUI);});
                 return ov;}

    function syncModalRuntimeState(){
        updateStartBtn();
        updateFeatureBtns();
        updateRuntimeSummary();
        upd();
        bindThresholdSlider('jz2_keep_attr','jz2_keep_attr_text');
        bindThresholdSlider('jz2_keep_skill','jz2_keep_skill_text');
        syncQualityPills();
        renderStatusHistory();
        setAutoGatherStatus(ST.gatherStatus);
        updateAutoGatherBtn();
        setAutoCombatStatus(ST.combatStatus);
        updateAutoCombatBtn();
        setAutoDungeonStatus(ST.autoDungeonStatus);
        updateAutoDungeonBtn();
        updateTeamFlowButton();
        renderTeamStatusText();
        if(ST.run) setStatus('总控运行中');
        else setStatus('空闲');
        setLogPanelVisible(UI.logPanelVisible);
        renderLogs();
        renderCompanionMonitorSnapshot();
        requestInformationMonitorRefresh('modal-open');
        adjustStatNumberFont();
        ST.q.en('sync-unclaimed',async()=>{try{await refreshUnclaimedMail();}catch(e){log('ERROR','同步未领邮件数失败',e?.message||String(e));}});
        ST.q.en('load-auto-dungeon-options',async()=>{try{await loadAutoDungeonOptions();}catch(e){setAutoDungeonStatus(`秘境列表加载失败：${e?.message||e}`);log('ERROR','自动秘境列表加载失败',e?.message||String(e));}});
    }

    function openModal(){
        removeCompanionModal();
        const modalEl=modal();
        document.body.appendChild(modalEl);
        syncModalRuntimeState();
    }
    function createMenuButton(menuList){
        const template=menuList.querySelector('.menu-item,[data-key],button,[role="button"]');
        if(template){
            const btn=template.cloneNode(true);
            btn.id='jz2_open';
            btn.removeAttribute('data-key');
            btn.removeAttribute('href');
            const label=btn.querySelector('.menu-item-label')||btn.querySelector('span:last-child');
            const firstSpan=btn.querySelector('span');
            if(firstSpan&&firstSpan!==label){
                firstSpan.textContent=HOME_ICON;
                firstSpan.style.marginRight='6px';
            }
            if(label) label.textContent='小伴侣';
            else btn.textContent=HOME_ICON+' 小伴侣';
            btn.onclick=null;
            btn.addEventListener('click',(e)=>{e.preventDefault();e.stopPropagation();openModal();});
            return btn;
        }
        const btn=document.createElement('button');
        btn.id='jz2_open';
        btn.className='menu-item';
        btn.innerHTML='<span style="margin-right:6px;">'+HOME_ICON+'</span><span class="menu-item-label">小伴侣</span>';
        btn.addEventListener('click',(e)=>{e.preventDefault();e.stopPropagation();openModal();});
        return btn;
    }

    function findHangupInMenu(menuList){
        const candidates=menuList.querySelectorAll('.menu-item,[data-key],button,[role="button"]');
        for(const node of candidates){
            const text=String(node.textContent||'').trim();
            const key=String(node.getAttribute?.('data-key')||'').toLowerCase();
            if(text.includes('挂机')||key==='idle'||key.includes('hang')) return node;
        }
        return null;
    }

    function injectMenuButton(){
        const tryInject=()=>{
            const menuList=document.querySelector('.menu-list');
            if(!menuList){setTimeout(tryInject,500);return;}
            if(document.getElementById('jz2_open')) return;

            const hangup=findHangupInMenu(menuList);
            const btn=createMenuButton(menuList);
            if(hangup&&hangup.parentNode) hangup.parentNode.insertBefore(btn,hangup.nextSibling);
            else menuList.appendChild(btn);
            log('INFO','入口按钮已插入菜单');
        };
        setTimeout(tryInject,800);
    }

    /*
 * 福利领取结算入口
 * 作用：统一处理签到类福利的跳过、成功、失败收尾，减少普通签到和月卡签到的重复代码。
 * 不做什么：不内置具体接口与奖励字段解析，接口调用和成功文案由调用方传入。
 * 输入：source 来源、label 日志标签、before 前置检查、action 领奖动作、onSuccess 成功结果格式化、shouldSkipError 错误跳过判断。
 * 输出：统一的 { signed, skipped, reward, error } 结果，供自动任务链路继续复用。
 * 数据流：任务结算 -> 本函数 -> 具体福利 API -> 状态栏 / 日志。
 * 边界条件与坑点：
 * 1. 未登录直接跳过，不发请求，避免把会话问题误记成领奖失败。
 * 2. 月卡未激活按需求保留失败日志，不转换成跳过，这样脚本会直接报错提示。
 */
    async function settleRewardAction({source,label,before=null,action,onSuccess=null,shouldSkipError=null}){
        if(!token()){
            log('DEBUG',`${label}跳过`,`${source}:未登录`);
            return{signed:false,skipped:true};
        }
        try{
            const precheck=before?await before():null;
            if(precheck?.skipReason){
                log('DEBUG',`${label}跳过`,`${source}:${precheck.skipReason}`);
                return{signed:false,skipped:true};
            }
            const result=await action();
            const summary=onSuccess?onSuccess(result):null;
            const reward=Math.max(0,i(summary?.reward,0));
            if(summary?.statusText) setStatus(summary.statusText);
            log('INFO',`${label}成功`,`${source}${summary?.logText?` ${summary.logText}`:''}`);
            return{signed:true,skipped:false,reward};
        }catch(e){
            const msg=String(e?.message||e||'');
            if(shouldSkipError&&shouldSkipError(msg)){
                log('DEBUG',`${label}跳过`,`${source}:${msg}`);
                return{signed:false,skipped:true};
            }
            log('ERROR',`${label}失败`,`${source}:${msg}`);
            return{signed:false,skipped:false,error:msg};
        }
    }

    async function settleDailySignIn(source){
        return settleRewardAction({
            source,
            label:'每日打卡',
            before:async()=>{
                const overview=await signInOverview();
                if(overview?.signedToday)return{skipReason:'今日已打卡'};
                return null;
            },
            action:()=>doSignInAction(),
            onSuccess:(result)=>{
                const reward=Math.max(0,i(result?.data?.reward,0));
                return{
                    reward,
                    statusText:`每日打卡完成${reward>0?`：+${reward}灵石`:''}`,
                    logText:reward>0?`reward=${reward}`:''
                };
            },
            shouldSkipError:(msg)=>/今日已签到|今日已打卡/.test(msg)
        });
    }

    async function settleMonthCardSignIn(source){
        return settleRewardAction({
            source,
            label:'月卡签到',
            action:()=>claimMonthCardRewardAction(),
            onSuccess:(result)=>{
                const reward=Math.max(0,i(result?.data?.rewardSpiritStones,0));
                return{
                    reward,
                    statusText:`月卡签到完成${reward>0?`：+${reward}灵石`:''}`,
                    logText:reward>0?`reward=${reward}`:''
                };
            },
            shouldSkipError:(msg)=>/今日已领取|已领取今日月卡奖励/.test(msg)
        });
    }

    async function settleRecurringTasks(){
        const daily=await settleTaskCategory('daily');
        const event=await settleTaskCategory('event');
        const submitted=daily.submitted+event.submitted;
        const claimed=daily.claimed+event.claimed;
        const detail=`提交${submitted} 领取${claimed}`;
        setStatus(`任务结算 ${detail}`);
        log('INFO','任务结算',detail);
        const signIn=await settleDailySignIn('自动采集任务结算后');
        const monthCardSignIn=await settleMonthCardSignIn('每日打卡后');
        return{submitted,claimed,signIn,monthCardSignIn};
    }

    function hasAutoDungeonActiveRuntime(){
        return !!(ST.autoDungeonBattleId||ST.autoDungeonInstanceId||ST.autoDungeonSessionId);
    }
    function clearAutoDungeonResumeTimer(){
        if(ST.autoDungeonIdleResumeTimer){
            clearTimeout(ST.autoDungeonIdleResumeTimer);
            ST.autoDungeonIdleResumeTimer=null;
        }
        ST.autoDungeonPendingIdleResume=false;
    }
    function scheduleAutoDungeonResumeIdle(tokenRef,reason,delayMs=T180){
        clearAutoDungeonResumeTimer();
        ST.autoDungeonPendingIdleResume=true;
        ST.autoDungeonIdleResumeTimer=setTimeout(async()=>{
            ST.autoDungeonIdleResumeTimer=null;
            if(!ST.autoDungeonRun||tokenRef!==ST.autoDungeonToken)return;
            ST.autoDungeonPendingIdleResume=false;
            await resumeIdleAfterAutoDungeon({
                successStatusText:`${reason}，已按当前配置恢复挂机`,
                errorStatusText:`${reason}，但恢复挂机失败：%ERROR%`
            });
            if(ST.autoDungeonRun&&tokenRef===ST.autoDungeonToken){
                setAutoDungeonStatus(`${reason} | 已恢复挂机，3分钟后继续巡检`);
            }
        },Math.max(T5,delayMs));
    }
    function updateAutoDungeonBtn(){
        const b=document.getElementById('jz2_auto_dungeon_toggle');
        if(!b)return;
        const enabled=!!cfg().enableAutoDungeon;
        if(enabled){
            b.textContent=ST.autoDungeonRun?'自动秘境:巡检中':'自动秘境:已启用';
            b.style.background='var(--danger,#ff4d4f)';
            b.style.borderColor='var(--danger,#ff4d4f)';
            b.style.color='#fff';
        }else{
            b.textContent='自动秘境:未启用';
            b.style.background='var(--primary,#1677ff)';
            b.style.borderColor='var(--primary,#1677ff)';
            b.style.color='#fff';
        }
    }
    function updateFeatureBtns(){
        const c=cfg();
        updateToggleBtn('jz2_toggle_dis_eq',c.enableAutoDisassemble,'装备分解:启用中','装备分解:未启用');
        updateToggleBtn('jz2_toggle_dis_item',c.autoDecomposeByNameEnabled,'物品分解:启用中','物品分解:未启用');
        updateToggleBtn('jz2_toggle_use',c.enableAutoUse,'礼盒开启:启用中','礼盒开启:未启用');
        updateToggleBtn('jz2_toggle_mail',c.enableAutoClaimMail,'收取邮件:启用中','收取邮件:未启用');
        updateToggleBtn('jz2_toggle_signin',c.enableAutoSignIn,'自动签到:启用中','自动签到:未启用');
        updateToggleBtn('jz2_toggle_monthcard',c.enableAutoMonthCard,'自动月卡:启用中','自动月卡:未启用');
        updateToggleBtn('jz2_toggle_wander',c.enableAutoWander,'自动奇遇:启用中','自动奇遇:未启用');
        updateSectShopFragmentBtn();
        updateAutoDungeonBtn();
    }
    function updateRuntimeSummary(){
        const c=cfg();
        const rt=document.getElementById('jz2_runtime_text');
        const dot2=document.getElementById('jz2_runtime_dot2');
        const runTxt=ST.run?'运行中':'已停止';
        const idleTxt=ST.idleStateKnown?(ST.idleStateRunning?'挂机中':'未挂机'):'挂机未知';
        const sum=`${runTxt} | ${idleTxt} | 装备:${c.enableAutoDisassemble?'开':'关'} | 物品:${c.autoDecomposeByNameEnabled?'开':'关'} | 礼盒:${c.enableAutoUse?'开':'关'} | 邮件:${c.enableAutoClaimMail?'开':'关'} | 签到:${c.enableAutoSignIn?'开':'关'} | 月卡:${c.enableAutoMonthCard?'开':'关'} | 奇遇:${c.enableAutoWander?'开':'关'} | 宗门:${c.enableAutoSectShopFragment?'开':'关'} | 秘境:${c.enableAutoDungeon?'开':'关'}`;
        if(rt)rt.textContent=sum;
        if(dot2)dot2.style.background=ST.run?'#2ea043':'#9aa4b2';
    }
    function runFeatureOnceOnToggle(key,label){
        if(!ST.run)return;
        const c=cfg();
        if(key==='enableAutoDisassemble'||key==='autoDecomposeByNameEnabled'){
            executeInstantAction(label,key,()=>doDis(c));
            return;
        }
        if(key==='enableAutoUse'){
            executeInstantAction(label,key,()=>doUse(c));
            return;
        }
        if(key==='enableAutoClaimMail'){
            startMail();
            return;
        }
        if(key==='enableAutoSignIn'){
            setStatus('自动签到开始处理...');
            startAutoSignIn('toggle');
            return;
        }
        if(key==='enableAutoMonthCard'){
            setStatus('自动月卡开始处理...');
            startAutoMonthCard('toggle');
            return;
        }
        if(key==='enableAutoWander'){
            setStatus('自动奇遇开始处理...');
            startAutoWander('toggle');
            return;
        }
        if(key==='enableAutoSectShopFragment'){
            setStatus('宗门残页开始处理...');
            startAutoSectShopFragment('toggle');
            return;
        }
        if(key==='enableAutoDungeon'){
            setAutoDungeonStatus('自动秘境开始巡检...');
        }
    }
    function stopAutoDungeon(silent=false){
        ST.autoDungeonRun=false;
        ST.autoDungeonToken+=1;
        ST.autoDungeonInstanceId='';
        ST.autoDungeonSessionId='';
        ST.autoDungeonBattleId='';
        resetAutoDungeonBattleFlag();
        ST.autoDungeonEnteredCurrentRun=false;
        ST.autoDungeonStopAfterCurrentRun=false;
        ST.autoDungeonStopAfterCurrentRunReason='';
        resetAutoDungeonErrorStreak();
        clearAutoDungeonResumeTimer();
        if(ST.autoDungeonStaminaWaitTimer){
            clearTimeout(ST.autoDungeonStaminaWaitTimer);
            ST.autoDungeonStaminaWaitTimer=null;
        }
        if(ST.autoDungeonStaminaCountdownInterval){
            clearInterval(ST.autoDungeonStaminaCountdownInterval);
            ST.autoDungeonStaminaCountdownInterval=null;
        }
        ST.autoDungeonStaminaWaiting=false;
        ST.autoDungeonStaminaEndTime=0;
        ST.autoDungeonStaminaCurrent=0;
        ST.autoDungeonStaminaMax=100;
        updateAutoDungeonBtn();
        if(!silent){
            setAutoDungeonStatus('空闲');
            log('INFO','自动秘境','已停止');
        }
    }
    async function runAutoDungeon(){
        if(ST.autoDungeonRun||!cfg().enableAutoDungeon)return;
        const selectionValue=getAutoDungeonSelectionValue();
        const parsed=parseAutoDungeonSelection(selectionValue);
        const matchedLabel=dungeonOptionsCache.find((item)=>item.value===selectionValue)?.label||selectionValue;
        if(!parsed){
            setAutoDungeonStatus('请选择秘境');
            log('WARN','自动秘境','未选择秘境');
            return;
        }
        const selection={...parsed,label:matchedLabel};
        ST.autoDungeonRun=true;
        ST.autoDungeonToken+=1;
        const tokenRef=ST.autoDungeonToken;
        let hasStartedBattle=false;
        updateAutoDungeonBtn();
        setAutoDungeonStatus(`自动秘境巡检中 | ${selection.label}`);
        try{
            while(ST.autoDungeonRun&&tokenRef===ST.autoDungeonToken){
                const staminaState=await getCharacterStaminaInfo();
                const stamina=Number(staminaState?.stamina||0);
                const hasActive=hasAutoDungeonActiveRuntime();
                if(stamina>=AUTO_DUNGEON_START_STAMINA){
                    clearAutoDungeonResumeTimer();
                    ST.autoDungeonStopAfterCurrentRun=false;
                    ST.autoDungeonStopAfterCurrentRunReason='';
                    if(!hasActive&&!ST.autoDungeonIdlePaused){
                        await pauseIdleForAutoDungeon();
                    }
                    await tickAutoDungeon(tokenRef,selection);
                    hasStartedBattle=true;
                    if(!ST.autoDungeonRun||tokenRef!==ST.autoDungeonToken)break;
                    await wait(T5);
                    continue;
                }
                if(stamina<AUTO_DUNGEON_STOP_STAMINA){
                    const reason=`体力 ${stamina}/${staminaState.staminaMax} < ${AUTO_DUNGEON_STOP_STAMINA}`;
                    clearAutoDungeonResumeTimer();
                    if(hasActive){
                        ST.autoDungeonStopAfterCurrentRun=true;
                        ST.autoDungeonStopAfterCurrentRunReason=reason;
                        setAutoDungeonStatus(`${reason}，当前秘境结束后恢复挂机`);
                        await tickAutoDungeon(tokenRef,selection);
                        if(!ST.autoDungeonRun||tokenRef!==ST.autoDungeonToken)break;
                        await wait(T5);
                    }else{
                        await resumeIdleAfterAutoDungeon({
                            successStatusText:`${reason}，已按当前配置恢复挂机`,
                            errorStatusText:`${reason}，但恢复挂机失败：%ERROR%`
                        });
                        setAutoDungeonStatus(`${reason}，已恢复挂机，3分钟后继续巡检`);
                        await wait(T180);
                    }
                    continue;
                }
                if(hasActive||hasStartedBattle){
                    clearAutoDungeonResumeTimer();
                    ST.autoDungeonStopAfterCurrentRun=false;
                    ST.autoDungeonStopAfterCurrentRunReason='';
                    if(!ST.autoDungeonIdlePaused){
                        await pauseIdleForAutoDungeon();
                    }
                    await tickAutoDungeon(tokenRef,selection);
                    hasStartedBattle=true;
                    if(!ST.autoDungeonRun||tokenRef!==ST.autoDungeonToken)break;
                    await wait(T5);
                    continue;
                }
                const reason=`体力 ${stamina}/${staminaState.staminaMax} 低于 ${AUTO_DUNGEON_START_STAMINA}`;
                scheduleAutoDungeonResumeIdle(tokenRef,reason,T180);
                setAutoDungeonStatus(`${reason}，静置3分钟后按当前配置挂机`);
                await wait(T180);
            }
        }catch(e){
            setAutoDungeonStatus(`异常：${e?.message||e}`);
            log('ERROR','自动秘境异常',e?.message||String(e));
        }finally{
            clearAutoDungeonResumeTimer();
            if(tokenRef===ST.autoDungeonToken){
                ST.autoDungeonRun=false;
                updateAutoDungeonBtn();
            }
            await resumeIdleAfterAutoDungeon({
                successStatusText:'自动秘境结束，已恢复挂机',
                errorStatusText:'自动秘境结束，但恢复挂机失败：%ERROR%'
            });
        }
    }
    function toggleAutoDungeon(){
        const c=cfg();
        c.enableAutoDungeon=!c.enableAutoDungeon;
        save(c);
        updateAutoDungeonBtn();
        updateRuntimeSummary();
        if(ST.run){
            if(c.enableAutoDungeon)runAutoDungeon();
            else stopAutoDungeon();
        }
    }

    function menu(){injectMenuButton();}

    function init(){
        if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init,{once:true});return;}
        hookNet();
        menu();
        startPageIdleFallbackWatcher();
        startIdleStateWatcher();
        upd();
        renderIdleSpiritTooltip(false);
        const hoverSelector='.idle-status-indicator,.idle-status-tooltip';
        document.addEventListener('pointerover',(e)=>{
            const target=e.target;
            if(!(target instanceof Element))return;
            if(!target.closest(hoverSelector))return;
            if(!idleTooltipHovering){
                idleTooltipHovering=true;
                void renderIdleSpiritTooltipAfterStatus(true);
            }
        },true);
        document.addEventListener('pointerout',(e)=>{
            const target=e.target;
            if(!(target instanceof Element))return;
            if(!target.closest(hoverSelector))return;
            const related=e.relatedTarget;
            if(related instanceof Element&&related.closest(hoverSelector))return;
            idleTooltipHovering=false;
        },true);
        if(ST.run){
            setStatus('总控已启动（自动恢复）');
            refresh(false);
            log('INFO','检测到运行态，已自动恢复');
        }else{
            setStatus('空闲');
            renderTeamStatusText();
        }
        updateTeamFlowButton();
        ST.q.en('init-unclaimed',async()=>{try{await refreshUnclaimedMail();}catch(e){log('ERROR','初始化未领邮件数失败',e?.message||String(e));}});
        log('INFO','小伴侣已加载');
    }
    init();
})();
