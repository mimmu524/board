import http from "http";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs"; // 비밀번호 암호화용
import jwt from "jsonwebtoken"; // 로그인 세션 관리용
const SECRET_KEY = "your_super_secret_key_here";

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "0000",
  database: "board",
  waitForConnections: true,
  connectionLimit: 10,
});

function verifyToken(req) {
  const auth = req.headers["authorization"];
  if (!auth) return null;
  const token = auth.split(" ")[1];
  try {
    return jwt.verify(token, SECRET_KEY); // { id, username }
  } catch (err) {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  // CORS 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // 회원가입
  if (req.url === "/register" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { username, email, password } = JSON.parse(body);
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
          "INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, NOW())",
          [username, email, hashedPassword]
        );
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "회원가입 성공" }));
      } catch (err) {
        console.error("회원가입 오류:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "회원가입 실패" }));
      }
    });
  }

  // 로그인
  else if (req.url === "/login" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { email, password } = JSON.parse(body);
        const [users] = await pool.query(
          "SELECT * FROM users WHERE email = ?",
          [email]
        );
        if (users.length === 0) {
          res.writeHead(401, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ error: "이메일이 존재하지 않습니다" })
          );
        }
        const user = users[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          res.writeHead(401, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "비밀번호 불일치" }));
        }

        // JWT 발급
        const token = jwt.sign(
          { id: user.id, username: user.username },
          SECRET_KEY,
          {
            expiresIn: "1h",
          }
        );

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "로그인 성공", token }));
      } catch (err) {
        console.error("로그인 오류:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `로그인 실패 ${err}` }));
      }
    });
  }

  // GET /users → 사용자 목록
  else if (req.url === "/users" && req.method === "GET") {
    try {
      const [rows] = await pool.query("SELECT id, username FROM users");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
    } catch (err) {
      console.error("DB 조회 오류:", err);
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf8" });
      res.end("DB 조회 오류 발생");
    }
  }

  // GET /posts → 게시글 목록 (likes, reports 개수 포함)
  else if (req.url === "/posts" && req.method === "GET") {
    try {
      const [rows] = await pool.query(
        `SELECT 
          p.*, 
          u.username,
          COALESCE(l.like_count, 0) as like_count,
          COALESCE(r.report_count, 0) as report_count
        FROM posts p 
        JOIN users u ON p.user_id = u.id
        LEFT JOIN (
          SELECT post_id, COUNT(*) as like_count 
          FROM likes 
          GROUP BY post_id
        ) l ON p.id = l.post_id
        LEFT JOIN (
          SELECT post_id, COUNT(*) as report_count 
          FROM reports 
          GROUP BY post_id
        ) r ON p.id = r.post_id
        ORDER BY p.created_at DESC`
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows));
    } catch (err) {
      console.error("DB 조회 오류:", err);
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf8" });
      res.end("DB 조회 오류 발생");
    }
  }

  // POST /posts → 게시글 작성
  else if (req.url === "/posts" && req.method === "POST") {
    const user = verifyToken(req);
    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "로그인이 필요합니다." }));
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { title, content } = JSON.parse(body);

        await pool.query(
          `INSERT INTO posts (user_id, title, content, created_at, updated_at)
           VALUES (?, ?, ?, NOW(), NOW())`,
          [user.id, title, content]
        );

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "게시글 저장 완료" }));
      } catch (err) {
        console.error("DB 저장 오류:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "DB 저장 오류" }));
      }
    });
  }

  // DELETE /posts/:id → 게시글 삭제
  else if (req.url.startsWith("/posts/") && req.method === "DELETE") {
    const parts = req.url.split("/");
    if (parts.length === 3) {
      const postId = parts[2];
      const user = verifyToken(req);

      if (!user) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "로그인이 필요합니다." }));
      }

      try {
        // 먼저 게시글 작성자 확인
        const [[post]] = await pool.query(
          "SELECT user_id FROM posts WHERE id = ?",
          [postId]
        );

        if (!post) {
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ error: "게시글을 찾을 수 없습니다." })
          );
        }

        // 작성자가 아닌 경우 권한 없음
        if (post.user_id !== user.id) {
          res.writeHead(403, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "삭제 권한이 없습니다." }));
        }

        // 관련된 likes, reports도 함께 삭제 (CASCADE 대신 직접 삭제)
        await pool.query("DELETE FROM likes WHERE post_id = ?", [postId]);
        await pool.query("DELETE FROM reports WHERE post_id = ?", [postId]);
        await pool.query("DELETE FROM posts WHERE id = ?", [postId]);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "게시글이 삭제되었습니다." }));
      } catch (err) {
        console.error("게시글 삭제 오류:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "게시글 삭제 실패" }));
      }
    }
  }

  // POST /posts/:id/like → 추천하기 (한 번만 가능)
  else if (
    req.url.startsWith("/posts/") &&
    req.url.endsWith("/like") &&
    req.method === "POST"
  ) {
    const postId = req.url.split("/")[2];
    const user = verifyToken(req);

    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "로그인이 필요합니다." }));
    }

    try {
      // 이미 추천했는지 확인
      const [[existingLike]] = await pool.query(
        "SELECT id FROM likes WHERE user_id = ? AND post_id = ?",
        [user.id, postId]
      );

      if (existingLike) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "이미 추천한 게시글입니다." }));
      }

      // 추천 추가
      await pool.query("INSERT INTO likes (user_id, post_id) VALUES (?, ?)", [
        user.id,
        postId,
      ]);

      // 총 추천 수 조회
      const [[likeCount]] = await pool.query(
        "SELECT COUNT(*) as count FROM likes WHERE post_id = ?",
        [postId]
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message: "추천 완료",
          likes: likeCount.count,
        })
      );
    } catch (err) {
      console.error("추천 오류:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "추천 실패" }));
    }
  }

  // DELETE /posts/:id/like → 추천 취소
  else if (
    req.url.startsWith("/posts/") &&
    req.url.endsWith("/like") &&
    req.method === "DELETE"
  ) {
    const postId = req.url.split("/")[2];
    const user = verifyToken(req);

    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "로그인이 필요합니다." }));
    }

    try {
      // 추천 기록이 있는지 확인
      const [[existingLike]] = await pool.query(
        "SELECT id FROM likes WHERE user_id = ? AND post_id = ?",
        [user.id, postId]
      );

      if (!existingLike) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(
          JSON.stringify({ error: "추천하지 않은 게시글입니다." })
        );
      }

      // 추천 삭제
      await pool.query("DELETE FROM likes WHERE user_id = ? AND post_id = ?", [
        user.id,
        postId,
      ]);

      // 총 추천 수 조회
      const [[likeCount]] = await pool.query(
        "SELECT COUNT(*) as count FROM likes WHERE post_id = ?",
        [postId]
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message: "추천 취소 완료",
          likes: likeCount.count,
        })
      );
    } catch (err) {
      console.error("추천 취소 오류:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "추천 취소 실패" }));
    }
  }

  // POST /posts/:id/report → 신고하기 (한 번만 가능)
  else if (
    req.url.startsWith("/posts/") &&
    req.url.endsWith("/report") &&
    req.method === "POST"
  ) {
    const postId = req.url.split("/")[2];
    const user = verifyToken(req);

    if (!user) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "로그인이 필요합니다." }));
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const { reason } = JSON.parse(body || "{}");

        // 이미 신고했는지 확인
        const [[existingReport]] = await pool.query(
          "SELECT id FROM reports WHERE user_id = ? AND post_id = ?",
          [user.id, postId]
        );

        if (existingReport) {
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ error: "이미 신고한 게시글입니다." })
          );
        }

        // 신고 추가
        await pool.query(
          "INSERT INTO reports (user_id, post_id, reason) VALUES (?, ?, ?)",
          [user.id, postId, reason || null]
        );

        // 총 신고 수 조회
        const [[reportCount]] = await pool.query(
          "SELECT COUNT(*) as count FROM reports WHERE post_id = ?",
          [postId]
        );

        // 신고 10회 이상 시 게시글 자동 삭제
        if (reportCount.count >= 10) {
          await pool.query("DELETE FROM likes WHERE post_id = ?", [postId]);
          await pool.query("DELETE FROM reports WHERE post_id = ?", [postId]);
          await pool.query("DELETE FROM posts WHERE id = ?", [postId]);

          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({
              deleted: true,
              message: "신고 누적으로 게시글이 삭제되었습니다.",
            })
          );
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            deleted: false,
            message: "신고 완료",
            reports: reportCount.count,
          })
        );
      } catch (err) {
        console.error("신고 오류:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "신고 실패" }));
      }
    });
  }

  // GET /posts/:id → 게시글 상세 조회 (현재 사용자의 추천/신고 여부 포함)
  else if (req.url.startsWith("/posts/") && req.method === "GET") {
    const parts = req.url.split("/"); // ['', 'posts', 'id']
    if (parts.length === 3) {
      const postId = parts[2];
      const user = verifyToken(req);

      try {
        const [[post]] = await pool.query(
          `SELECT 
            p.id, p.user_id, p.title, p.content,
            p.created_at, p.updated_at, u.username,
            COALESCE(l.like_count, 0) as like_count,
            COALESCE(r.report_count, 0) as report_count
          FROM posts p
          JOIN users u ON p.user_id = u.id
          LEFT JOIN (
            SELECT post_id, COUNT(*) as like_count 
            FROM likes 
            WHERE post_id = ?
          ) l ON p.id = l.post_id
          LEFT JOIN (
            SELECT post_id, COUNT(*) as report_count 
            FROM reports 
            WHERE post_id = ?
          ) r ON p.id = r.post_id
          WHERE p.id = ?`,
          [postId, postId, postId]
        );

        if (!post) {
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(
            JSON.stringify({ error: "게시글을 찾을 수 없습니다." })
          );
        }

        // 현재 사용자의 추천/신고 여부 확인
        let userLiked = false;
        let userReported = false;

        if (user) {
          const [[likeCheck]] = await pool.query(
            "SELECT id FROM likes WHERE user_id = ? AND post_id = ?",
            [user.id, postId]
          );
          userLiked = !!likeCheck;

          const [[reportCheck]] = await pool.query(
            "SELECT id FROM reports WHERE user_id = ? AND post_id = ?",
            [user.id, postId]
          );
          userReported = !!reportCheck;
        }

        const result = {
          ...post,
          likes: post.like_count, // 기존 필드명 호환성
          userLiked,
          userReported,
        };

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(result));
      } catch (err) {
        console.error("게시글 조회 오류:", err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "DB 조회 오류" }));
      }
    }
  }

  // 기타
  else {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf8" });
    res.end("Hello! 서버 + MySQL");
  }
});

server.listen(5000, () => console.log("서버 실행 중: http://localhost:5000"));
