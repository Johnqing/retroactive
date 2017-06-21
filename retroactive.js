var __config = {
    year: '2017',
    month: '06'
}

/**
 * 异步插入script
 * @param url        插入脚本的url
 * @param callback   加载成功后回调
 * @returns {String}
 */
function createScript(url, callback){
    var oScript = document.createElement('script');
    oScript.type = 'text/javascript';
    oScript.async = true;
    oScript.src = url;
    oScript.onload = function(){
        callback();
    };
    document.body.appendChild(oScript);
}
/**
 * 清楚指定的html标签
 * @param html        被清除的字段
 * @param arr         需要被清除的html标签
 * @returns {String}
 */
function clearHtml(html, arr){
    for(var i = 0; i<arr.length; i++){
        html = html.replace(`<${arr[i]}>`, '');
        html = html.replace(`</${arr[i]}>`, '');
    }
    return html;
}
// 补签操作
function retroactive(config){
    setTimeout(function(){
        $.ajax({
            type: 'post',
            url: 'http://hr.jointwisdom.net/kq/kqself/card/carddata.do?b_makesave=link&z5=02&account=aa&ip_adr='+config.ip,
            data: {
                "makeup_date": config.date,
                "makeup_time": config.time,
                "cardtime_field-inputEl": config.time,
                "oper_cause": "忘打卡"
            },
            success: function(html){
                html = clearHtml(html, ['html', 'head', 'meta', 'title', 'body']);
                var dom = $(`<div>${html}</div>`);

                var table = dom.find('.ftable tr:eq(1) td');
                var text = table.text();
                if(text){
                    return console.log(config.date + ' ' + config.time + ':' + text);
                }
                console.log(config.date + ' ' + config.time + '补签成功');
                // console.log(html);
            }
        })
    }, 1000);
    
}
/**
 * 获取本地ip
 * @param callback
 * @returns {String}
 */
function getIPs(callback){
    var ip_dups = {};
    //compatibility for firefox and chrome
    var RTCPeerConnection = window.RTCPeerConnection
        || window.mozRTCPeerConnection
        || window.webkitRTCPeerConnection;
    var useWebKit = !!window.webkitRTCPeerConnection;
    //bypass naive webrtc blocking
    if(!RTCPeerConnection){
        //create an iframe node
        var iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        //invalidate content script
        iframe.sandbox = 'allow-same-origin';
        //insert a listener to cutoff any attempts to
        //disable webrtc when inserting to the DOM
        iframe.addEventListener("DOMNodeInserted", function(e){
            e.stopPropagation();
        }, false);
        iframe.addEventListener("DOMNodeInsertedIntoDocument", function(e){
            e.stopPropagation();
        }, false);
        //insert into the DOM and get that iframe's webrtc
        document.body.appendChild(iframe);
        var win = iframe.contentWindow;
        RTCPeerConnection = win.RTCPeerConnection
            || win.mozRTCPeerConnection
            || win.webkitRTCPeerConnection;
        useWebKit = !!win.webkitRTCPeerConnection;
    }
    //minimal requirements for data connection
    var mediaConstraints = {
        optional: [{RtpDataChannels: true}]
    };
    //firefox already has a default stun server in about:config
    //    media.peerconnection.default_iceservers =
    //    [{"url": "stun:stun.services.mozilla.com"}]
    var servers = undefined;
    //add same stun server for chrome
    if(useWebKit)
        servers = {iceServers: [{urls: "stun:stun.services.mozilla.com"}]};
    //construct a new RTCPeerConnection
    var pc = new RTCPeerConnection(servers, mediaConstraints);
    function handleCandidate(candidate){
        //match just the IP address
        var ip_regex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/
        var ip_addr = ip_regex.exec(candidate)[1];
        //remove duplicates
        if(ip_dups[ip_addr] === undefined)
            callback(ip_addr);
        ip_dups[ip_addr] = true;
    }
    //listen for candidate events
    pc.onicecandidate = function(ice){
        //skip non-candidate events
        if(ice.candidate)
            handleCandidate(ice.candidate.candidate);
    };
    //create a bogus data channel
    pc.createDataChannel("");
    //create an offer sdp
    pc.createOffer(function(result){
        //trigger the stun server request
        pc.setLocalDescription(result, function(){}, function(){});
    }, function(){});
    //wait for a while to let everything done
    setTimeout(function(){
        //read candidate info from local description
        var lines = pc.localDescription.sdp.split('\n');
        lines.forEach(function(line){
            if(line.indexOf('a=candidate:') === 0)
                handleCandidate(line);
        });
    }, 1000);
}

createScript('http://resource.brandwisdom.cn/js/191.js', function(){

    //insert IP addresses into the page
    getIPs(function(ip){
        console.log('当前本机ip为：',ip);
        // ip自动生成
        // var ip = '192.168.195.' + (Math.ceil(Math.random()*35));
        $('body').html('');
        // 根据配置自己调节补那个月的考勤
        $.ajax({
            type: 'post',
            url: 'http://hr.jointwisdom.net/kq/kqself/details/month_details.do?b_query=link',
            data: {
                "kq_years": __config.year,
                "tem": __config.year + "-" + __config.month,
                "listpagination": "kqDetailsForm",
                "current":1
            },
            success: function(html){
                html = clearHtml(html, ['html', 'head', 'meta', 'title', 'body']);

                var dom = $(`<div>${html}</div>`);


                var table = dom.find('#table .fixedDiv2 tbody');

                table.find('thead').remove();
                var tr = table.find('tr');

                // table转为json
                var tableArr = [];
                tr.each(function(){
                    var td = $(this).find('td');
                    var tdArr = [];
                    td.each(function(){
                        var value = $(this).text();
                        value = value.replace(/\s/g, '');
                        tdArr.push(value);
                    });
                    tableArr.push(tdArr);
                });

                //console.log(tableArr);

                // 找到实际的出勤情况
                var count = 0;
                tableArr.forEach((tr)=>{
                    var pm = tr[31] || tr[32];
                    var am = tr[29] || tr[30];
                    //console.log(tr[31], tr[32]);
                    //console.log(tr[29], tr[30]);

                    if(!am  && !pm){
                        return;
                    }

                    
                    if(pm){
                        count += 1;
                        retroactive({
                            date: tr[0],
                            time: '19:05',
                            ip: ip
                        });
                    }

                    if(am){
                        count += 1;
                        retroactive({
                            date: tr[0],
                            time: '08:55',
                            ip: ip
                        });
                    }

                    

                });

                if(!count){
                    console.log('竟然没有缺勤，给你点赞！');
                }

            }
        });
    });
});
