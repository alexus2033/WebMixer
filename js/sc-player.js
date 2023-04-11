// Soundcloud player script V1.0
{
    const SCAPI = "https://api.soundcloud.com";
    
    var SCPlayerDuration = [0,0],
        SCPlayerPosition = [0,0];

    var settings = {color: "%23ff4400",
        auto_play: false,
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

    function SCPlayerCreate(id,trackURL) {        
        var ifrm = document.createElement("iframe");
        ifrm.setAttribute("src", createURL(trackURL,settings));
        ifrm.setAttribute("allow","autoplay");
        ifrm.setAttribute("frameborder","no");
        ifrm.setAttribute("id",`sc-player${id}`);
        ifrm.style.height = "130px";
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
    
    // load file into next available player
    function loadSCTrackID(trackID){
        var target = `${SCAPI}/tracks/${trackID}`,
        id = 0;
        if(control[0].playing){
            id = 1;
        }
        control[id].loadSCTrack(target,settings);
    }

    function SCPlayerCreateEvents(id){
        var widgetIframe = document.getElementById(`sc-player${id}`),
            widget = SC.Widget(widgetIframe);
    
        widget.bind(SC.Widget.Events.READY, function() {
            widget.getDuration(function(seconds) {
                SCPlayerDuration[id]=seconds;
            });  
            widget.getCurrentSound(function(currentSound) {
                if(currentSound.title){
                    control[id].title = currentSound.title;
                    printInfo(currentSound.genre);
                } else {
                    const meta = currentSound.publisher_metadata; 
                    if(meta){
                        control[id].title = meta.release_title;
                        printInfo(meta.artist);
                    }
                }         
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
          });
          widget.bind(SC.Widget.Events.FINISH, function() {
            control[id].active = false;
            console.log("Finito!");
          });
        });
    }

    // Update Time-Displays
    function SCPlayerUpdateTime(id){
        var remain = SCPlayerDuration[id] - SCPlayerPosition[id];
        remain=remain/1000;
        var mins = parseInt((remain/60)%60),
        secs = parseInt(remain%60),
        millis = remain.toFixed(2).slice(-2,-1);
        sendShortMsg([0x94+id, 0x16, millis]);
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
        if(mins && outputs.length == 0){
            pos[id].innerHTML = `-${mins}:${secs.pad(2)}.${millis}`;
        }
    }
}