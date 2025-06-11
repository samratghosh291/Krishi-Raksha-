import { useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import DragDropFileInput from "./assets/DragDropUploader.jsx";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function App() {
  const [loading, setLoading] = useState(false);
  const [ragLoading, setRagLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [ragResult, setRagResult] = useState(null);

  const analyzeUrl = "https://8b88-27-131-210-65.ngrok-free.app/analyze";
  const ragUrl = "https://f955-103-77-138-82.ngrok-free.app/generate";

  const resetState = () => {
    setError(null);
    setAnalyzeResult(null);
    setRagResult(null);
  };

  const handleImageFile = (selectedFile) => {
    if (selectedFile?.type.startsWith("image/")) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      resetState();
      setError("✅ Image updated successfully!");
    } else {
      setError("❌ Please select a valid image file");
      setFile(null);
      setPreviewUrl(null);
      resetState();
    }
  };

  const handlePreviewClick = () => {
    if (file) {
      const previewWindow = window.open();
      previewWindow.document.write(
        `<html><head><title>Preview</title></head><body><img src="${previewUrl}" style="max-width:100%;height:auto;" /></body></html>`
      );
      previewWindow.document.close();
    } else {
      setError("❌ No image selected to preview");
    }
  };

  const handleSendClick = async () => {
    if (!file) {
      setError("❌ Please select or drop an image");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(analyzeUrl, { method: "POST", body: formData });
      const data = await res.json();

      if (res.ok) {
        setAnalyzeResult(data);
        setError(null);
        setRagResult(null);
      } else {
        setError(
          `❌ Analyze API error: ${data.error || "Failed to process image"} (Status: ${res.status})`
        );
      }
    } catch (err) {
      setError(`❌ Error uploading image: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSeeMoreClick = async () => {
    if (!analyzeResult) {
      setError("❌ No analysis data available to fetch more details");
      return;
    }

    setRagLoading(true);
    const payload = {
      messages: [
        {
          content:
            "Tell me about this disease and also provide prevention methods for this severity level.",
        },
      ],
      predicted_class: analyzeResult?.disease_classification?.predicted_class || "Unknown",
      severity: analyzeResult?.disease_segmentation?.severity || 0,
      severity_class: analyzeResult?.disease_segmentation?.classification || "Unknown",
    };

    try {
      const res = await fetch(ragUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setRagResult(data);
        setError(null);
      } else {
        setError(
          `❌ RAG API error: ${data.error || "Failed to get RAG output"} (Status: ${res.status})`
        );
      }
    } catch (err) {
      setError(`❌ Error fetching RAG data: ${err.message}`);
    } finally {
      setRagLoading(false);
    }
  };

  const getSeverityColor = (level) => {
    switch (level?.toLowerCase()) {
      case "mild":
        return "#FFC107";
      case "moderate":
        return "#FF9800";
      case "severe":
        return "#F44336";
      case "healthy":
        return "#4CAF50";
      default:
        return "#9E9E9E";
    }
  };

  const severityPercentage = analyzeResult?.disease_segmentation?.severity || 0;
  const healthyColor = "#4CAF50";
  const diseaseColor = "#F44336";

  return (
    <div className="container">
      <h1 className="title">🌿 Disease Detection System</h1>

      <DragDropFileInput
        onFileSelect={handleImageFile}
        dragActive={dragActive}
        setDragActive={setDragActive}
      />

      <div className="button-group">
        <button
          className="btn preview-btn"
          onClick={handlePreviewClick}
          disabled={loading || !file}
        >
          Preview
        </button>
        <button
          className="btn analyze-btn"
          onClick={handleSendClick}
          disabled={loading || !file}
        >
          Analyze
        </button>
      </div>

      {loading && (
        <div className="progress-container">
          <div className="progress-bar"></div>
          <p>Uploading & Analyzing...</p>
        </div>
      )}

      {error && (
        <div className={error.includes("✅") ? "success-message" : "error-message"}>
          {error}
        </div>
      )}

      {analyzeResult && (
        <div className="results-container">
          <section className="result-section">
            <h2>📊 Analysis Result</h2>

            <div className="grid-container">
              <div className="chart-container">
                <h3>Disease Classification</h3>
                <div className="chart-wrapper">
                  <Bar
                    data={{
                      labels: Object.keys(
                        analyzeResult.disease_classification.probabilities || {}
                      ),
                      datasets: [
                        {
                          label: "Probability (%)",
                          data: Object.values(
                            analyzeResult.disease_classification.probabilities || {}
                          ).map((v) => (v * 100).toFixed(2)),
                          backgroundColor: Object.keys(
                            analyzeResult.disease_classification.probabilities || {}
                          ).map((key) =>
                            key.toLowerCase() === "healthy" ? healthyColor : diseaseColor
                          ),
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: function (context) {
                              return `${context.parsed.y}%`;
                            },
                          },
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100,
                          ticks: {
                            callback: function (value) {
                              return value + "%";
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
              </div>

              <div className="severity-container">
                <h3>Severity Percentage</h3>
                <div className="severity-chart">
                  <Doughnut
                    data={{
                      labels: ["Diseased", "Healthy"],
                      datasets: [
                        {
                          data: [severityPercentage, 100 - severityPercentage],
                          backgroundColor: [
                            getSeverityColor(
                              analyzeResult?.disease_segmentation?.classification
                            ),
                            healthyColor,
                          ],
                          borderWidth: 0,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: "70%",
                      plugins: {
                        legend: {
                          position: "bottom",
                          labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: "circle",
                          },
                        },
                        tooltip: {
                          callbacks: {
                            label: function (context) {
                              return `${context.label}: ${context.raw}%`;
                            },
                          },
                        },
                      },
                    }}
                  />
                  <div className="severity-percentage">
                    <span
                      style={{
                        color: getSeverityColor(
                          analyzeResult?.disease_segmentation?.classification
                        ),
                      }}
                    >
                      {severityPercentage}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="segmentation-info">
              <h3>Disease Segmentation</h3>
              <div className="info-grid">
                <div>
                  <span className="info-label">Boundary Pixels:</span>
                  <span className="info-value">
                    {analyzeResult?.disease_segmentation?.boundary_pixels ?? "N/A"}
                  </span>
                </div>
                <div>
                  <span className="info-label">Disease Pixels:</span>
                  <span className="info-value">
                    {analyzeResult?.disease_segmentation?.disease_pixels ?? "N/A"}
                  </span>
                </div>
                <div>
                  <span className="info-label">Total Leaf Area:</span>
                  <span className="info-value">
                    {analyzeResult?.disease_segmentation?.total_leaf_area ?? "N/A"}
                  </span>
                </div>
                <div>
                  <span className="info-label">Severity:</span>
                  <span
                    className="info-value"
                    style={{
                      color: getSeverityColor(
                        analyzeResult?.disease_segmentation?.classification
                      ),
                    }}
                  >
                    {severityPercentage}%
                  </span>
                </div>
                <div>
                  <span className="info-label">Classification:</span>
                  <span
                    className="info-value"
                    style={{
                      color: getSeverityColor(
                        analyzeResult?.disease_segmentation?.classification
                      ),
                    }}
                  >
                    {analyzeResult?.disease_segmentation?.classification || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div className="output-images">
              <h3>📷 Output Images</h3>
              <div className="image-grid">
                {["original_image", "diseased_area_image", "annotated_image"].map((imgKey) => {
                  const base64Image = analyzeResult?.disease_segmentation?.[imgKey];
                  const isValidBase64 = base64Image && typeof base64Image === "string" && base64Image.length > 0;

                  return (
                    <div key={imgKey} className="image-card">
                      <h4>{imgKey.replace(/_/g, " ").toUpperCase()}</h4>
                      {isValidBase64 ? (
                        <img
                          src={base64Image}
                          alt={imgKey}
                          className="result-image"
                          onError={(e) => {
                            e.target.src = "";
                            e.target.alt = "Failed to load image";
                          }}
                        />
                      ) : (
                        <div className="image-placeholder">
                          No image available (Not provided by API)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              className="btn see-more-btn"
              onClick={handleSeeMoreClick}
              disabled={loading || ragLoading}
            >
              {ragLoading ? "Loading..." : "See More Details"}
            </button>
          </section>
        </div>
      )}

      {ragLoading && (
        <div className="progress-container">
          <div className="progress-bar"></div>
          <p>Fetching disease information...</p>
        </div>
      )}

      {ragResult && (
        <div className="rag-output">
          <h2>🧠 Disease Information & Prevention</h2>
          <div className="rag-content prose max-w-none">
            {ragResult?.message || ragResult?.answer || ragResult?.response ? (
              <ReactMarkdown>
                {ragResult?.message || ragResult?.answer || ragResult?.response}
              </ReactMarkdown>
            ) : (
              "No response available"
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;