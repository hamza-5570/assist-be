import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "alipsn1228@gmail.com",
    pass: "qawjlfbikihbjira",
  },
});

const sendMail = async (receiverEmail, subject, body) => {
  await transport.sendMail({
    from: process.env.EMAIL,
    to: receiverEmail,
    subject: subject,
    html: body,
  });
};

export default sendMail;
