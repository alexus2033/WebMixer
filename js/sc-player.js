// Soundcloud player script V1.0
{
    const SCAPI = "https://api.soundcloud.com";
    
    var SCPlayerPosition = [0,0];

    var settings = {color: "%23ff4400",
        single_active: false,
        hide_related: true,
        show_comments: false,
        buying: false,
        show_user: false,
        show_playcount: false,
        show_reposts: false,
        show_artwork: false,
        show_teaser: false
        };

    function SCPlayerCreate(id,trackURL,autoplay = false) {
        settings["auto_play"] = autoplay;       
        var ifrm = document.createElement("iframe");
        ifrm.setAttribute("src", createURL(trackURL,settings));
        ifrm.setAttribute("allow","autoplay");
        ifrm.setAttribute("frameborder","no");
        ifrm.setAttribute("id",`sc-player${id}`);
        ifrm.style.height = "140px";
        ifrm.style.width = "100%";
        deck[id].appendChild(ifrm);
        
        var widgetIframe = document.getElementById(`sc-player${id}`);
        control[id].widget = SC.Widget(widgetIframe);
        SCPlayerCreateEvents(id); 
    }

    function createURL(trackURL,props)
    {
      var result = `https://w.soundcloud.com/player/?url=${trackURL}`;
      Object.entries(props).forEach(entry => {
        const [key, value] = entry;
        result += `&${key}=${value}`;
      });
      return result;
    }
    
    function SCGetTrackURL(trackID,autoplay = false){
        if(trackID.startsWith("SC/")){
            trackID = trackID.replace("SC/","tracks/");
        }
        var target = `${SCAPI}/${trackID}`;
        settings["auto_play"] = autoplay;
        return [target, settings];
    }

    function SCgetPlaylist(widget,id){
        widget.getSounds(function(plist) {
            if(plist.length > 0){
                widget.getCurrentSoundIndex(function(index) {
                    playerInfo[id].innerText += ` ${index+1}/${plist.length}`;
                });
                console.log(plist);
            }
        });    
    }

    function SCextractTitle(bigURL){
        const regex = new RegExp("(title=\"((?:\\\\.|[^\"\\\\]){0,})\")", "g");
        var x, result;
        while ((x = regex.exec(bigURL))!= null) {
            if(x.length>1){
                result = htmlDecode(x[2]);
            }
        }
        return result;
    }

    function SCextractID(bigURL){
        var SCid = bigURL.match(/\/tracks\/[0-9]+/i);
        if(!SCid || SCid.length==0){
            SCid = bigURL.match(/\/users\/[0-9]+/i);
        }
        if(!SCid || SCid.length==0){
            return null;
        }
        SCid = SCid[0].substring(1).toLowerCase();
        return SCid.replace("tracks/","SC/");
    }
    
    function SCgetCurrentTitle(id,currentSound){
        const meta = currentSound.publisher_metadata;
        var SCurl = SCextractID(currentSound.uri),
            title = currentSound.title,
            artwork = currentSound.artwork_url,
            genre = currentSound.genre ? currentSound.genre : "",
            artist = meta.artist ? meta.artist : "";
        if(meta.release_title){
            title = meta.release_title;
        }
        if(SCurl){
            writeTitle(SCurl,title,artist,artwork,genre);
        }
        extraInfo[id].innerText = genre;
    }

    function SCPlayerCreateEvents(id){    
        var widgetIframe = document.getElementById(`sc-player${id}`),
        widget = SC.Widget(widgetIframe);

        widget.bind(SC.Widget.Events.READY, function() {
            console.log(`ready player ${id}`);
            widget.getDuration(function(x){
                control[id].duration = x;
        });
        widget.bind(SC.Widget.Events.PLAY_PROGRESS, function(x){
        var pos = x.currentPosition;
        if(SCPlayerPosition[id] != pos){
            SCPlayerPosition[id]=pos;
            SCPlayerUpdateTime(id);
        }
        });
        widget.bind(SC.Widget.Events.PAUSE, function() {
            control[id].playing = false;
        });    
        widget.bind(SC.Widget.Events.PLAY, function() {
            control[id].playing = true;
            widget.getCurrentSound(function(currentSound) {
                control[id].duration = currentSound.duration;
                SCgetCurrentTitle(id,currentSound);         
            });
            if(control[id].url.startsWith("users/")){
                SCgetPlaylist(widget,id);
            }       
        });
        widget.bind(SC.Widget.Events.FINISH, function() {
            console.log("Finito!");
            control[id].active = false;
        });
    });
    }

    function SCPlayerDestroy(id){
        var widgetIframe = document.getElementById(`sc-player${id}`),
            widget = SC.Widget(widgetIframe);
        if(widget){
            widget.unbind();
        }
        widgetIframe.parentElement.innerHTML = "";
    }

    // Update Time-Displays
    function SCPlayerUpdateTime(id){
        var widgetIframe = document.getElementById(`sc-player${id}`),
            widget = SC.Widget(widgetIframe);

        var remain = control[id].duration - SCPlayerPosition[id];
        remain=remain/1000;
        var mins = parseInt((remain/60)%60),
        secs = parseInt(remain%60),
        millis = remain.toFixed(2).slice(-2,-1);
        if(millis >= 0){
            sendShortMsg([0x94+id, 0x16, millis]);
        }
        if(prevSecs != secs){
            sendShortMsg([0x94+id, 0x15, secs]);
            prevSecs = secs;
        }
        if(prevMins != mins){
            sendShortMsg([0x94+id, 0x14, mins]);
            prevMins = mins;
        }
        if(remain < 21 && remain > 0 && control[id].EOM == false){
            control[id].EOM = true;
        }
        pos[id].innerHTML = `-${mins}:${secs.pad(2)}.${millis}`;
    }
}