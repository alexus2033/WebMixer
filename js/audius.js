function AudiusExtractID(bigURL){
    var Aid = bigURL.match(/\/tracks?\/[A-Z0-9]+/i);
    if(!Aid || Aid.length==0){
        return null;
    }
    Aid = Aid[0].replace("/track/","/tracks/");
    return Aid.substring(1);
}

async function AudiusReadMetadata(url){
    if(!url.startsWith("http")){
        url = AudiusTrackURL(url);
    }        
    const headers = {
        'Accept':'application/json'
    };
    
    var result = await fetch(url+"?app_name=AlphabeatPlayer",
    {
        method: 'GET',
        headers: headers
    })
    .then(AudiusHandleError)
    .then(function(res) {
        return res.json();
    }).then(function(content) {
        return content.data;
    });
    return result;
}

function AudiusSaveMetadata(trackURL, meta){
    let title = (meta ? meta.title : newUrl),
        artist = (meta.user.name ? meta.user.name : ""),
        artwork = (meta.artwork['480x480'] ? meta.artwork['480x480'] : ""),
        newTitle = new DBtitle([trackURL, title, artist, artwork]);
    newTitle.genre = (meta.genre ? meta.genre : "");
    newTitle.duration = meta.duration*1000;
    newTitle.insert();
}

function AudiusHandleError(response) {
    if (!response.ok) {
        printInfo(response.statusText);
        return;
    }
    return response;
}

function AudiusStreamURL(track){
    track = track.replace("audius/","tracks/");
    var url = AudiusAddress + "/v1/" + track;
    return `${url}/stream?app_name=AlphabeatPlayer`;
}

function AudiusTrackURL(track){
    track = track.replace("audius/","tracks/");
    var url = AudiusAddress + "/v1/" + track;
    return `${url}?app_name=AlphabeatPlayer`;
}

const AudiusDemoItem = {
    id: "audius/qGBBkOP",
    name: "Orange tales - Like that",
    artist: "Destinuna",
    genre: "Electronic",
    coverArt: "https://audius-content-14.figment.io/content/QmebtB7V8JtcetCrCB3ndmdgESjMFhSkm6NnSoyfMVJBLv/480x480.jpg",
    added: 1697391643396,
    start: 0
};

(async () => { 
    AudiusAddress = "https://discoveryprovider.audius.co";
    const sample = (arr) => arr[Math.floor(Math.random() * arr.length)],
        headers = {
            'Accept':'application/json'
        };

    var host = await fetch('https://api.audius.co',{
        method: 'GET',
        headers: headers
        }).then(res => res.json())
        .then(j => j.data)
        .then(d => sample(d))

    if(host){
        AudiusAddress = host;
    }
})().catch( console.error );

