import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'lintanzhuliani840@gmail.com',
    pass: 'sbho exfi xotp qstr',
  },
});

async function main() {
  try {
    await transporter.sendMail({
      from: 'furrkid5data@gmail.com',
      to: 'lintanzhuliani840@gmail.com',
      subject: 'Test Email',
      text: 'This is a test email to check credentials',
    });
    console.log("SUCCESS");
  } catch (err) {
    console.error("FAILED", err);
  }
}
main();
