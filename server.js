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

app.get('/ios', (req, res) => {
    res.set('Content-Type', 'application/x-apple-aspen-config');
    res.sendFile(path.join(__dirname + "/web/cert", 'install-profile.mobileconfig'));
});

app.get('/cert', (req, res) => {
    res.set('Content-Type', 'application/x-x509-ca-cert');
    res.setHeader('Content-Disposition', 'attachment; filename="cert.crt"');
    res.sendFile(path.join(__dirname + "/web/cert", 'cert.crt'));
});

app.get('/android', (req, res) => {
    res.set('Content-Type', 'application/x-pkcs12');
    res.set('Content-Disposition', 'attachment; filename="cert.p12"');
    res.sendFile(path.join(__dirname + "/web/cert", 'cert.p12'));
});

app.listen(80, () => {
    console.log('Server running at http://localhost:80');
});
