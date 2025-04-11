let API_KEY = "";

fetch('API_Key.txt')
    .then(response => response.text())
    .then(text => {
        console.log('讀到的內容：', text);
        API_KEY = text;
    })
    .catch(err => {
        console.error('讀取錯誤:', err);
    });

document.getElementById("ytBtn").addEventListener("click", search);

async function search() {
    const query = document.getElementById('searchBar').value.trim();
    if (!query) return;

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=9&q=${encodeURIComponent(query)}&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = ''; // 清空舊資料

    data.items.forEach(item => {
        const id = item.id.videoId;
        const title = item.snippet.title;
        const thumbnail = item.snippet.thumbnails.medium.url;

        const div = document.createElement('div');
        div.className = 'video';
        div.innerHTML = `
          <img src="${thumbnail}" alt="${title}">
          <p>${title}</p>
        `;
        div.addEventListener('click', () => {
            const player = document.getElementById('player');
            player.src = `https://www.youtube.com/embed/${id}?autoplay=1`;
        });

        resultsDiv.appendChild(div);
    });
}