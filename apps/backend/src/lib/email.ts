import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL || 'furrkid5data@gmail.com',
    pass: process.env.SMTP_PASSWORD || '',
  },
});

export const sendResetPasswordEmail = async (email: string, resetUrl: string) => {
  const mailOptions = {
    from: `"Sistem POS Calico" <${process.env.SMTP_EMAIL || 'furrkid5data@gmail.com'}>`,
    to: email,
    subject: 'Reset Password Akun Calico Pet Care Anda',
    html: `
      <div style="font-family: Arial, sans-serif; max-w: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #D35400;">Calico's Pet Care</h2>
        <p>Halo,</p>
        <p>Seseorang baru saja meminta pengaturan ulang (reset) password untuk akun Anda di sistem Kasir POS Calico.</p>
        <p>Jika ini memang Anda, silakan klik tombol di bawah ini untuk membuat password baru:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #D35400; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password Sekarang</a>
        </div>
        <p style="color: #666; font-size: 13px;">Jika tombol di atas tidak berfungsi, Anda bisa menyalin link berikut dan menempelkannya di browser:</p>
        <p style="color: #666; font-size: 13px; word-break: break-all;">${resetUrl}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">Jika Anda tidak merasa meminta reset password, abaikan email ini. Password Anda akan tetap aman.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reset password email sent to ${email}`);
  } catch (error) {
    console.error('Error sending reset password email:', error);
    throw new Error('Gagal mengirim email reset password');
  }
};
