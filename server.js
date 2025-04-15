const express = require('express');
const path = require('path');
const app = express();

app.use(express.static('web'));
// 導到首頁
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'index.html'));
});

// 通知頁面
app.get('/plugin', (req, res) => {
    res.sendFile(path.join(__dirname, 'plugin', 'index.html'));
});

app.listen(80, () => {
    console.log('Server running at http://localhost:80');
});
