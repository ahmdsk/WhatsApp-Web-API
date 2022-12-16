const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path');
const bodyParser = require('body-parser');
const formatPhone = require('./helpers/formatPhone');

const registerUser = async (number) => {
    return await client.isRegisteredUser(number);
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const client = new Client({
    puppeteer: {
        headless: true,
    },
    authStrategy: new LocalAuth()
});

client.initialize();

io.on('connection', (socket) => {
    socket.emit('message', 'Menghubungkan...');

    client.on('qr', (qr) => {
        qrcode.toDataURL(qr, (err, url) => {
            socket.emit('qr', url);
            socket.emit('message', 'QR Code Diterima, Silahkan Scan!');
        });
    });

    client.on('ready', () => {
        socket.emit('ready', 'WhatsApp siap!');
        socket.emit('message', 'WhatsApp siap!');
    });
    
    client.on('authenticated', () => {
        socket.emit('authenticated', 'WhatsApp telah terhubung');
        socket.emit('message', 'WhatsApp telah terhubung');
    });

    client.on('auth_failure', () => {
        socket.emit('message', 'Autentikasi gagal, mengubungkan kembali...');
    });

    client.on('disconnected', (reason) => {
        socket.emit('message', 'WhatsApp gagal terhubung!, mengubungkan kembali...');
        client.destroy();
        client.initialize();
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/index.html'));
});

app.post('/kirimpesan', async (req, res) => {
    let nomor = formatPhone(req.body.nomor);
    let pesan = req.body.pesan;

    const isRegisteredNumber = await registerUser(nomor);

    if(!isRegisteredNumber){
        res.status(422).json({
            status: false,
            message: 'Gagal Mengirim Pesan!, No Telpon Tidak Terdaftar Pada WhatsApp!'
        });
    }

    client.sendMessage(nomor, pesan)
        .then(() => {
            res.status(200).json({
                status: true,
                message: 'Berhasil Mengirim Pesan'
            })
        }).catch(() => {
            res.status(500).json({
                status: false,
                message: 'Gagal Mengirim Pesan'
            })
        })
});

server.listen(8080, () => {
    console.log("app listening on port 8080")
});