import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import bcrypt from "bcryptjs"; // <- 추가

function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 비밀번호 암호화
      // const hashedPassword = await bcrypt.hash(form.password, 10);

      await axios.post("http://localhost:5000/register", {
        username: form.username,
        email: form.email,
        password: form.password, // 암호화된 비밀번호
      });

      alert("회원가입 성공!");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.error || "회원가입 실패");
    }
  };

  return (
    <div>
      <h1>회원가입</h1>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "10px" }}
      >
        <input
          type="text"
          placeholder="아이디"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          required
        />
        <input
          type="email"
          placeholder="이메일"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <button type="submit">가입</button>
      </form>
    </div>
  );
}

export default Register;
