# Alphabeat Web Player/Mixer with Soundcloud/Audius-Integration

DJ programs for mixing songs are a dime a dozen, but so far only a few are open source projects with a free cloud connection. Thanks to HTML5 and the Web MIDI API, browsers have become powerful enough to visualize MP3 files and communicate directly with MIDI controllers. With the help of this technology, the Alphabeat mixer can be accessed from anywhere without installation. Embedded links can be used to add songs from Audius or Soundcloud to the playlist. Local Sound files can be integrated.
Your songs in the playlist remain stored locally in the browser and can be imported or exported as a CSV file. This makes it possible to use the cloud services without logging in and keep personal data. When using the Alphabeat midi controller, keyboard operation can be completely dispensed with thanks to the rotary knob and faders.

## Features
* Start [here](https://alexus2033.github.io/WebMixer/player.html) without Installation
* Slim and fast Web-Interface for all modern Browsers
* No Account/Login needed, playlist is stored in the browser only
* 2 Decks for [Soundcloud](https://soundcloud.com), [Audius](https://audius.co/trending)-Tracks or local Sound-Files
* Fast Track-Selector
* End-of-Track Indicator
* Speed-Control for local files
* Select Audio Output-Devices for each Deck
* Playlist Import/Export

## Used Libraries
* [jQuery](https://jquery.com)
* [Wavesurfer](https://wavesurfer-js.org) to display nice waveforms of a song
* [Soundcloud Widgets](https://developers.soundcloud.com/docs/api/html5-widget)
* [Web MIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API) to contact optional hardware
* [jsMediatags](https://github.com/aadsm/jsmediatags) to read song information from local files
* [Moment.js](https://github.com/moment/moment) to display relative Time

## Hardware
* Arduino-based [Alphabeat Controller](https://github.com/alexus2033/Alphabeat-Controller)
