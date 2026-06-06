// ==UserScript==
// @name         B站弹幕数（无回退版）
// @namespace    https://github.com/Minecraft365871/bilidanmaku-exact
// @version      4.0
// @description  显示当前分P弹幕数，多P返回0则显示0，不再回退到总数。优先读取播放器UI数据，失败则回退XML接口。
// @author       Minecraft_365871
// @copyright    2026   Minecraft_365871 (https://github.com/Minecraft365871)
// @license      GPL-3.0
// @match        https://www.bilibili.com/video/*
// @icon         https://www.bilibili.com/favicon.ico
// @updateURL    https://raw.githubusercontent.com/Minecraft365871/bilidanmaku-exact/main/BiliDanmaku-Exact.meta.js
// @downloadURL  https://raw.githubusercontent.com/Minecraft365871/bilidanmaku-exact/main/BiliDanmaku-Exact.user.js
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    let countSpan = null;
    let lastBvid = null;
    let lastPage = null;
    let lastDanmaku = null;

    function getBvid() {
        const m = location.pathname.match(/\/video\/([A-Za-z0-9]+)/);
        return m ? m[1] : null;
    }

    function getCurrentPage() {
        const m = location.search.match(/[?&]p=(\d+)/);
        return m ? parseInt(m[1], 10) : 1;
    }

    // 【核心改进】直接从播放器 UI 读取已经渲染好的弹幕数
    function getDanmakuCountFromUI() {
        const selectors = [
            '.bpx-player-ctrl-danmaku-num',
            '.bpx-player-video-info-danmaku-num',
            '.bilibili-player-video-info-danmaku-number',
            '.bpx-player-ctrl-btn-danmaku .bpx-player-ctrl-btn-icon-text'
        ];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) {
                const text = el.textContent.trim();
                // 匹配数字，支持 "1.2万" 格式
                const match = text.match(/^(\d+(\.\d+)?)(万)?$/);
                if (match) {
                    let num = parseFloat(match[1]);
                    if (match[3] === '万') num *= 10000;
                    return Math.floor(num);
                }
            }
        }
        return null;
    }

    // 备用方案：请求 XML 接口统计弹幕数
    function fetchDanmakuXml(cid, callback) {
        const url = `https://api.bilibili.com/x/v1/dm/list.so?oid=${cid}`;
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            headers: { 'Referer': 'https://www.bilibili.com/' },
            onload: function(resp) {
                try {
                    if (resp.status !== 200) { callback(null); return; }
                    const parser = new DOMParser();
                    const xml = parser.parseFromString(resp.responseText, 'text/xml');
                    const count = xml.getElementsByTagName('d').length;
                    callback(count);
                } catch (e) {
                    callback(null);
                }
            },
            onerror: function() { callback(null); }
        });
    }

    // 获取视频信息以拿到 cid
    function fetchView(bvid, callback) {
        const url = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            headers: { 'Referer': 'https://www.bilibili.com/' },
            onload: function(resp) {
                try {
                    const data = JSON.parse(resp.responseText);
                    if (data.code === 0 && data.data) callback(data.data);
                    else callback(null);
                } catch (e) { callback(null); }
            },
            onerror: function() { callback(null); }
        });
    }

    // 更新显示
    function updateDisplay(total) {
        // 寻找插入点，兼容新旧版播放器
        let targetDiv = document.querySelector('.bpx-player-video-info') || document.querySelector('.bpx-player-ctrl-wrap');
        if (!targetDiv) return;

        if (!countSpan || countSpan.parentElement !== targetDiv) {
            const old = document.getElementById('danmu-count-custom');
            if (old) old.remove();

            countSpan = document.createElement('span');
            countSpan.id = 'danmu-count-custom';
            countSpan.style.marginLeft = '10px';
            countSpan.style.color = '#fff';
            countSpan.style.fontSize = '13px';
            countSpan.style.lineHeight = '36px';
            targetDiv.appendChild(countSpan);
        }

        countSpan.innerHTML = '';
        countSpan.appendChild(document.createTextNode('已装填 '));

        const numSpan = document.createElement('span');
        numSpan.style.color = '#00a1d6';
        numSpan.style.fontWeight = 'bold';
        numSpan.textContent = (total !== null && total !== undefined) ? total : '??';
        countSpan.appendChild(numSpan);

        countSpan.appendChild(document.createTextNode(' 条弹幕'));
    }

    function refresh() {
        const bvid = getBvid();
        const page = getCurrentPage();
        if (!bvid) {
            updateDisplay(null);
            return;
        }

        // 如果 BVID 和分P 没变，优先尝试从 UI 更新
        if (bvid === lastBvid && page === lastPage) {
            const uiCount = getDanmakuCountFromUI();
            if (uiCount !== null) {
                lastDanmaku = uiCount;
                updateDisplay(uiCount);
                return;
            }
            if (lastDanmaku !== null) {
                updateDisplay(lastDanmaku);
                return;
            }
        }

        lastBvid = bvid;
        lastPage = page;
        lastDanmaku = null;
        updateDisplay(null);

        // 优先尝试从 UI 读取
        const uiCount = getDanmakuCountFromUI();
        if (uiCount !== null) {
            lastDanmaku = uiCount;
            updateDisplay(uiCount);
            return;
        }

        // UI 读取失败，回退到 API
        fetchView(bvid, function(viewData) {
            if (!viewData) { updateDisplay(null); return; }

            const pages = viewData.pages || [];
            const index = page - 1;
            if (index < 0 || index >= pages.length) { updateDisplay(null); return; }

            const cid = pages[index].cid;

            fetchDanmakuXml(cid, function(count) {
                if (count !== null && count !== undefined) {
                    lastDanmaku = count;
                    updateDisplay(count);
                } else {
                    lastDanmaku = null;
                    updateDisplay(null);
                }
            });
        });
    }

    function start() {
        setTimeout(refresh, 2000);

        // 定时检查 URL 变化和 UI 更新
        setInterval(() => {
            const bvid = getBvid();
            const page = getCurrentPage();
            if (bvid !== lastBvid || page !== lastPage) {
                refresh();
            } else {
                // 即使 URL 没变，也尝试从 UI 更新弹幕数
                const uiCount = getDanmakuCountFromUI();
                if (uiCount !== null && uiCount !== lastDanmaku) {
                    lastDanmaku = uiCount;
                    updateDisplay(uiCount);
                }
            }
        }, 2000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();