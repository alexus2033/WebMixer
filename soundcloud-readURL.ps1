## Extract Song-Info from Soundcloud ##
## V1.0 by alexus2033

function extractText {
    param (
        [string]$content,
        [string]$start,
        [string]$stop = '"'
    )

    $posA = $content.indexOf($start);
    if($posA -gt 0){
        $posA = $posA+$start.Length
        $posB = $content.IndexOf($stop,$posA)
        if($posB -gt 0 -and $posA-$posB -lt 200){
            return $content.Substring($posA,$posB-$posA)
        }    
    }
    return ""
}

$webpage = Read-Host "Enter Soundcloud-Url"

$x = Invoke-WebRequest -Uri $webpage -ContentType "text/plain; charset=utf-8"
$ctx = $x.Content

$title = extractText $ctx -start """twitter:title"" content=""" -stop """>"
$track = extractText $ctx -start """uri"":""https://api.soundcloud.com/tracks/"
$user = extractText $ctx -start """uri"":""https://api.soundcloud.com/users/"

write-host "Title: $title"
write-host "Track-ID: $track"
write-host "User-ID: $user"