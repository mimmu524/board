import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import "bootstrap/dist/css/bootstrap.min.css";

function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [user, setUser] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch (err) {
        console.error("토큰 디코딩 오류:", err);
      }
    }

    // 게시글 정보 로드
    loadPost();
  }, [id]);

  const loadPost = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/posts/${id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      setPost(res.data);
    } catch (err) {
      console.error("게시글 로드 오류:", err);
      if (err.response?.status === 404) {
        alert("게시글을 찾을 수 없습니다.");
        navigate("/posts");
      }
    }
  };

  if (!post) return <p>로딩중...</p>;

  const handleLike = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      let res;

      if (post.userLiked) {
        // 추천 취소
        res = await axios.delete(`http://localhost:5000/posts/${id}/like`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // 추천하기
        res = await axios.post(
          `http://localhost:5000/posts/${id}/like`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      // 게시글 정보 다시 로드
      await loadPost();
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.error || "추천 처리 실패");
    }
  };

  const handleReport = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (post.userReported) {
      alert("이미 신고한 게시글입니다.");
      return;
    }

    setShowReportModal(true);
  };

  const submitReport = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `http://localhost:5000/posts/${id}/report`,
        { reason: reportReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.deleted) {
        alert("신고 10회 초과로 게시글이 삭제되었습니다.");
        navigate("/posts");
      } else {
        alert(`신고 완료`);
        await loadPost(); // 게시글 정보 다시 로드
      }
    } catch (err) {
      alert(err.response?.data?.error || "신고 처리 실패");
    } finally {
      setShowReportModal(false);
      setReportReason("");
    }
  };

  const handleDelete = async () => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`http://localhost:5000/posts/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        alert("삭제 완료");
        navigate("/posts");
      } catch (error) {
        console.error("삭제 오류:", error);
        if (error.response?.status === 401) {
          alert("로그인이 필요합니다.");
        } else if (error.response?.status === 403) {
          alert("삭제 권한이 없습니다.");
        } else {
          alert("삭제 중 오류가 발생했습니다.");
        }
      }
    }
  };

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-body">
          <h2 className="card-title">{post.title}</h2>
          <h6 className="card-subtitle mb-2 text-muted">
            작성자: {post.username}
          </h6>
          <p className="card-text" style={{ whiteSpace: "pre-wrap" }}>
            {post.content}
          </p>
          <p>추천 수 👍: {post.likes || post.like_count || 0}</p>

          <div className="d-flex gap-2">
            {user && (
              <>
                <button
                  className={`btn ${
                    post.userLiked ? "btn-primary" : "btn-outline-primary"
                  }`}
                  onClick={handleLike}
                  disabled={post.userLiked}
                >
                  👍 {post.userLiked ? "추천완료" : "추천"}
                </button>

                <button
                  className={`btn ${
                    post.userReported ? "btn-danger" : "btn-outline-danger"
                  }`}
                  onClick={handleReport}
                  disabled={post.userReported}
                >
                  🚨 {post.userReported ? "신고완료" : "신고"}
                </button>
              </>
            )}

            {user && user.id === post.user_id && (
              <>
                <button
                  className="btn btn-outline-warning"
                  onClick={() => alert("수정 기능 구현 예정")}
                >
                  ✏ 수정
                </button>
                <button className="btn btn-outline-dark" onClick={handleDelete}>
                  🗑 삭제
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <button
        className="btn btn-secondary mt-3 mb-3"
        onClick={() => navigate("/posts")}
      >
        ← 목록으로
      </button>

      {/* 신고 모달 */}
      {showReportModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">게시글 신고</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowReportModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="reportReason" className="form-label">
                    신고 사유 (선택사항)
                  </label>
                  <textarea
                    className="form-control"
                    id="reportReason"
                    rows="3"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="신고 사유를 입력해주세요..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowReportModal(false)}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={submitReport}
                >
                  신고하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PostDetail;
