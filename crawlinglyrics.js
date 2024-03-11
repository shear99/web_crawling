const axios = require('axios');
const cheerio = require('cheerio');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

async function fetchMusicSearchResults(query) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://music.bugs.co.kr/search/integrated?q=${encodedQuery}`;

  try {
    const response = await axios.get(url);
    const data = response.data;
    const $ = cheerio.load(data);
    const trackRows = $('#wrap #hyrendContentBody #container .sectionPadding.track .innerContainer #DEFAULT0 .list.trackList tbody tr');

    let tracks = [];
    trackRows.each(function() {
      const title = $(this).find('th p.title a').attr('title').trim();
      const artist = $(this).find('td.left p.artist a').text().trim();
      const album = $(this).find('td.left a.album').text().trim();
      const url = $(this).find('td').eq(2).find('a').attr('href');
      tracks.push({ title, artist, album, url });
    });

    if (tracks.length === 0) {
      console.log('해당하는 곡이 없습니다. 다시 입력해주세요.');
      start();
      return;
    }

    return tracks;
  } catch (error) {
    console.error(`Error fetching music search results: ${error}`);
    start();
  }
}

async function fetchLyricsForTrack(trackUrl) {
  try {
    const response = await axios.get(trackUrl);
    const data = response.data;
    const $ = cheerio.load(data);
    const lyricsComingSoon = $('div.lyricsContainer p.comingsoon').length > 0;
    if (lyricsComingSoon) {
      console.log('가사 준비중입니다.');
      return false;
    }
    const lyrics = $('div.lyricsContainer xmp').text();
    console.log(lyrics || '가사를 찾을 수 없습니다.');
    return true;
  } catch (error) {
    console.error(`Error fetching lyrics: ${error}`);
    return false;
  }
}

function askForTrackName(tracks) {
  readline.question('곡 번호를 입력해주세요 (예: 1): ', async (input) => {
    const index = parseInt(input, 10) - 1;
    if (isNaN(index) || index < 0 || index >= tracks.length) {
      console.log('잘못된 번호입니다. 올바른 번호를 입력해주세요.');
      askForTrackName(tracks);
      return;
    }
    const track = tracks[index];
    const lyricsFetched = await fetchLyricsForTrack(track.url);
    if (!lyricsFetched) {
      askForTrackName(tracks);
    } else {
      readline.close();
    }
  });
}

function start() {
  readline.question('검색할 곡의 이름을 입력해주세요: ', async (query) => {
    const tracks = await fetchMusicSearchResults(query);
    if (tracks) {
      console.log('검색 결과:');
      tracks.forEach((track, index) => {
        console.log(`${index + 1}: ${track.title} - ${track.artist} [${track.album}]`);
      });
      askForTrackName(tracks);
    }
  });
}

start();
