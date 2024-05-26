const express = require("express");
const QRCode = require("qrcode");
const TelegramBot = require("node-telegram-bot-api");
const request = require("request");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const mathjs = require("mathjs");
const groupChatId = -4253298186;
const app = express();
const token = "7185153110:AAG3jntkyv_OEKrwBMvh5AZPf6Qm-1nFRl0"; // Thay 'YOUR_TELEGRAM_BOT_TOKEN' bằng mã token của Bot Telegram của bạn
const bot = new TelegramBot(token, { polling: true });
const PORT = 3001;

app.use(express.static(path.join(__dirname, "public")));

app.get("/generateQR", async (req, res) => {
  try {
    const url = req.query.url || "https://example.com";
    await QRCode.toFile("public/qrcode.png", url);
    res.redirect("/");
  } catch (err) {
    console.error("Error generating QR code:", err);
    res.status(500).send("Internal Server Error");
  }
});

function parseVietnameseNumber(numberStr) {
  return parseFloat(numberStr.replace(/\./g, '').replace(/,/g, '.'));
}

bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  if (messageText.startsWith("/qr")) {
    const args = messageText.split(" ");
    if (args.length < 3) {
      bot.sendMessage(
        chatId,
        "Sử dụng: /qr <số tiền hoặc số lượng*giá> <ghi chú>\n\nVí dụ:\n/qr 100.000 Chuyển khoản qua MobileApp\n/qr 100000*2 Chuyển khoản qua MobileApp"
      );
      return;
    }

    const input = args[1];
    const note = args.slice(2).join(" ");

    let result2;
    if (input.includes("*")) {
      const parts = input.split("*");
      if (parts.length !== 2) {
        bot.sendMessage(chatId, "Số lượng và giá phải được chia rõ ràng bằng dấu '*'.");
        return;
      }
      const quantity = parseVietnameseNumber(parts[0]);
      const price = parseVietnameseNumber(parts[1]);
      if (isNaN(quantity) || isNaN(price)) {
        bot.sendMessage(chatId, "Số lượng và giá phải là một số.");
        return;
      }
      result2 = Math.round(quantity * price);
    } else {
      result2 = parseVietnameseNumber(input);
      if (isNaN(result2)) {
        bot.sendMessage(chatId, "Số tiền phải là một số.");
        return;
      }
    }

    const bankName = "ACB";
    const accountNumber = "3968796666";
    const accountHolderName = "PHAN VAN THE";

    const qrCodeUrl = `https://api.vieqr.com/vietqr/${bankName}/${accountNumber}/${result2}/qr.jpg?NDck=${encodeURIComponent(
      note
    )}&FullName=${encodeURIComponent(accountHolderName)}`;

    bot.sendPhoto(groupChatId, qrCodeUrl, {
      caption: `Số tiền thanh toán là: <b>${result2.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}</b>\n\nThông tin bank: \n<b>${bankName}</b> - <b>${accountNumber}</b>\n<b>${accountHolderName}</b>\n\nNote : <b>${note}</b>\n\n<b>(Thanh toán QR đã bao gồm số tiền và ND Chuyển khoản)</b>`,
      parse_mode: "HTML",
    });
  }

  if (messageText.startsWith("/total")) {
    const args = messageText.split(" ");
    if (args.length < 4) {
      bot.sendMessage(chatId, "Sử dụng: /total <biểu thức toán học> <Tên ngân hàng> <số tài khoản> <Tên người thụ hưởng>\n\nVí dụ: /total (100000*25000) ACB 3968796666 PHAN VAN THE\n\nhoặc\n\n/total (100.000*25.000) ACB 3968796666 PHAN VAN THE");
      return;
    }

    const expression = args[1];
    const bankName = args[2];
    const accountNumber = args[3];

    // Tìm vị trí của tên người thụ hưởng
    let accountHolderNameIndex = 4;
    for (let i = 4; i < args.length; i++) {
      if (isNaN(parseVietnameseNumber(args[i]))) {
        accountHolderNameIndex = i;
        break;
      }
    }

    const accountHolderName = args.slice(accountHolderNameIndex).join(' ');

    let result;
    try {
      result = mathjs.evaluate(expression.replace(/,/g, '').replace(/\./g, ''));
    } catch (err) {
      bot.sendMessage(chatId, "Lỗi trong biểu thức toán học.");
      return;
    }

    if (isNaN(result)) {
      bot.sendMessage(chatId, "Kết quả phải là một số.");
      return;
    }

    const qrCodeUrl = `https://api.vieqr.com/vietqr/${bankName}/${accountNumber}/${result}/qr.jpg?NDck=${encodeURIComponent(
      `PHAN VAN THE CHUYEN KHOAN ${accountHolderName}`
    )}&FullName=${encodeURIComponent(accountHolderName)}`;

    bot.sendPhoto(groupChatId, qrCodeUrl, {
      caption: `Số tiền thanh toán là: <b>${result.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}</b>\n\nThông tin bank: \n<b>${bankName}</b> - <b>${accountNumber}</b>\n<b>${accountHolderName}</b>\n\nNote : <b>PHAN VAN THE THANH TOAN ${accountHolderName}</b>\n\n<b><i>(Thanh toán QR đã bao gồm số tiền và ND Chuyển khoản)</i></b>`,
      parse_mode: "HTML",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
