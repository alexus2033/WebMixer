function AudiusExtractID(bigURL){
    var Aid = bigURL.match(/\/tracks?\/[A-Z0-9]+/i);
    if(!Aid || Aid.length==0){
        return null;
    }
    Aid = Aid[0].replace("/track/","/tracks/");
    return Aid.substring(1);
}

async function AudiusReadMetadata(url){
        
    const headers = {
        'Accept':'application/json'
    };
    
    var result = await fetch(url+"?app_name=AlphabeatPlayer",
    {
        method: 'GET',
        headers: headers
    })
    .then(function(res) {
        return res.json();
    }).then(function(content) {
        console.log(content.data);
        return content.data;
    });
    return result;
}

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

console.log(AudiusAddress);
