const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const request = require("request");
const translate = require('@iamtraction/google-translate');
const ytdl = require('ytdl-core');
const fs = require('fs');

const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require("path");
const bodyParser = require("body-parser");
const formatPhone = require("./helpers/formatPhone");

const registerUser = async (number) => {
  return await client.isRegisteredUser(number);
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const client = new Client({
  puppeteer: {
    headless: true,
  },
  authStrategy: new LocalAuth(),
});

client.initialize();

io.on("connection", (socket) => {
  socket.emit("message", "Menghubungkan...");

  client.on("qr", (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit("qr", url);
      socket.emit("message", "QR Code Diterima, Silahkan Scan!");
    });
  });

  client.on("ready", () => {
    socket.emit("ready", "WhatsApp siap!");
    socket.emit("message", "WhatsApp siap!");
    console.log("WhatsApp Ready");
  });

  client.on("authenticated", () => {
    socket.emit("authenticated", "WhatsApp telah terhubung");
    socket.emit("message", "WhatsApp telah terhubung");
  });

  client.on("auth_failure", () => {
    socket.emit("message", "Autentikasi gagal, mengubungkan kembali...");
  });

  client.on("disconnected", (reason) => {
    socket.emit(
      "message",
      "WhatsApp gagal terhubung!, mengubungkan kembali..."
    );
    client.destroy();
    client.initialize();
  });
});

client.on("message", async (msg) => {
  if (msg.body == "!ping") {
    msg.reply("pong");
  } else if (msg.body == "/sticker") {
    const clientId = await (await msg.getChat()).id._serialized;

    if (msg.hasMedia) {
      const media = await msg.downloadMedia();

      if (media) {
        msg.reply(media, clientId, {
          sendMediaAsSticker: true,
          stickerName: "HaloBot Sticker",
          stickerAuthor: "HaloBot",
        });
      } else {
        msg.reply("Gagal Mengunduh Gambar...");
      }
    } else {
      msg.reply("Pilih Gambar mu boss...");
    }
  } else if (msg.body == "/quotes") {
    const listCategory = [
      "age",
      "alone",
      "amazing",
      "anger",
      "architecture",
      "art",
      "attitude",
      "beauty",
      "best",
      "birthday",
      "business",
      "car",
      "change",
      "communications",
      "computers",
      "cool",
      "courage",
      "dad",
      "dating",
      "death",
      "design",
      "dreams",
      "education",
      "environmental",
      "equality",
      "experience",
      "family",
      "funny",
      "future",
      "happiness",
      "health",
      "history",
      "humor",
      "inspirational",
      "intelligence",
      "knowledge",
      "leadership",
      "learning",
      "life",
      "love",
      "marriage",
      "men",
      "money",
      "morning",
      "success",
    ];
    const randomCategory =
      listCategory[Math.floor(Math.random() * listCategory.length)];

    request.get(
      {
        url: "https://api.api-ninjas.com/v1/quotes?category=" + randomCategory,
        headers: {
          "X-Api-Key": "8YNFgtfrA/S825F5hYjZKA==rJZhtFntK2nQv7Pa",
        },
      },
      function (error, response, body) {
        if (error) {
            return msg.reply("Request failed:", error);
        } else if (response.statusCode != 200) {
            msg.reply("Error:", response.statusCode, body.toString("utf8"));
        } else {
            const q = JSON.parse(body)[0];
            translate(q.quote, { to: 'id' }).then(res => {
                msg.reply(`${res.text}\n~ ${q.author}`);
            }).catch(err => {
                msg.reply(err);
            });
        }
      }
    );
  } else if(msg.body.startsWith("/translate")) {
    const input_text = msg.body.split(' ');
    const text = input_text.slice(1).join(' ');
    translate(text, { to: 'id' }).then(res => {
        msg.reply(`*Menerjemahkan*:\n${text}\n\n*Hasil Terjemahan:*\n${res.text}`);
    }).catch(err => {
        msg.reply(err);
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/views/index.html"));
});

app.post("/kirimpesan", async (req, res) => {
  let nomor = formatPhone(req.body.nomor);
  let pesan = req.body.pesan;

  const isRegisteredNumber = await registerUser(nomor);

  if (!isRegisteredNumber) {
    res.status(422).json({
      status: false,
      message:
        "Gagal Mengirim Pesan!, No Telpon Tidak Terdaftar Pada WhatsApp!",
    });
  }

  client
    .sendMessage(nomor, pesan)
    .then(() => {
      res.status(200).json({
        status: true,
        message: "Berhasil Mengirim Pesan",
      });
    })
    .catch(() => {
      res.status(500).json({
        status: false,
        message: "Gagal Mengirim Pesan",
      });
    });
});

server.listen(8080, () => {
  console.log("app listening on port 8080");
});
