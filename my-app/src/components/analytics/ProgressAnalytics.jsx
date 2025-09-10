import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import analyticsService from '../../services/analyticsService';
import { useApi } from '../../hooks/useApi';
import { formatDate, formatFileSize } from '../../utils/helpers';
import toast from 'react-hot-toast';
import './ProgressAnalytics.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const ProgressAnalytics = () => {
  const { loading, execute } = useApi();
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      await execute(async () => {
        const response = await analyticsService.getStudentProgress();
        setAnalytics(response.data);
      });
    } catch {
      toast.error('Failed to load analytics data');
    }
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="spinner"></div>
        <p>Loading your progress analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="analytics-error">
        <div className="error-icon">
          <i className="fas fa-chart-line"></i>
        </div>
        <h3>No Analytics Data Available</h3>
        <p>Start downloading study materials to see your progress analytics.</p>
      </div>
    );
  }

  const { overview, downloadsBySubject, monthlyDownloads, subjectPerformance, recentActivity, learningStreak } = analytics;

  // Chart configurations
  const downloadsBySubjectChart = {
    labels: Object.keys(downloadsBySubject),
    datasets: [
      {
        label: 'Downloads',
        data: Object.values(downloadsBySubject),
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
          '#06B6D4',
          '#84CC16',
          '#F97316',
        ],
        borderColor: [
          '#2563EB',
          '#059669',
          '#D97706',
          '#DC2626',
          '#7C3AED',
          '#0891B2',
          '#65A30D',
          '#EA580C',
        ],
        borderWidth: 2,
      },
    ],
  };

  const monthlyDownloadsChart = {
    labels: Object.keys(monthlyDownloads).map(month => {
      const date = new Date(month + '-01');
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }),
    datasets: [
      {
        label: 'Downloads',
        data: Object.values(monthlyDownloads),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
      },
    ],
  };

  const subjectPerformanceChart = {
    labels: Object.keys(subjectPerformance),
    datasets: [
      {
        label: 'Average Rating',
        data: Object.values(subjectPerformance).map(perf => perf.averageRating),
        backgroundColor: [
          '#10B981',
          '#3B82F6',
          '#F59E0B',
          '#EF4444',
          '#8B5CF6',
        ],
        borderColor: [
          '#059669',
          '#2563EB',
          '#D97706',
          '#DC2626',
          '#7C3AED',
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        font: {
          size: 16,
          weight: 'bold',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  return (
    <div className="progress-analytics">
      <div className="analytics-header">
        <h2 className="analytics-title">
          <i className="fas fa-chart-line"></i>
          Progress Analytics
        </h2>
        <p className="analytics-subtitle">Track your learning journey with detailed insights</p>
      </div>

      {/* Overview Cards */}
      <div className="analytics-overview">
        <div className="overview-card">
          <div className="card-icon downloads">
            <i className="fas fa-download"></i>
          </div>
          <div className="card-content">
            <h3>{overview.totalDownloads}</h3>
            <p>Total Downloads</p>
          </div>
        </div>
        
        <div className="overview-card">
          <div className="card-icon subjects">
            <i className="fas fa-book"></i>
          </div>
          <div className="card-content">
            <h3>{overview.uniqueSubjects}</h3>
            <p>Subjects Studied</p>
          </div>
        </div>
        
        <div className="overview-card">
          <div className="card-icon streak">
            <i className="fas fa-fire"></i>
          </div>
          <div className="card-content">
            <h3>{learningStreak.current}</h3>
            <p>Day Streak</p>
          </div>
        </div>
        
        <div className="overview-card">
          <div className="card-icon size">
            <i className="fas fa-database"></i>
          </div>
          <div className="card-content">
            <h3>{formatFileSize(overview.totalFileSize)}</h3>
            <p>Total Size</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="analytics-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <i className="fas fa-chart-pie"></i>
          Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          <i className="fas fa-chart-line"></i>
          Progress
        </button>
        <button 
          className={`tab-button ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          <i className="fas fa-star"></i>
          Performance
        </button>
        <button 
          className={`tab-button ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <i className="fas fa-history"></i>
          Activity
        </button>
      </div>

      {/* Tab Content */}
      <div className="analytics-content">
        {activeTab === 'overview' && (
          <div className="tab-panel">
            <div className="charts-grid">
              <div className="chart-container">
                <h3>Downloads by Subject</h3>
                <div className="chart-wrapper">
                  <Doughnut data={downloadsBySubjectChart} options={doughnutOptions} />
                </div>
              </div>
              
              <div className="chart-container">
                <h3>Monthly Downloads</h3>
                <div className="chart-wrapper">
                  <Line data={monthlyDownloadsChart} options={chartOptions} />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="tab-panel">
            <div className="charts-grid">
              <div className="chart-container full-width">
                <h3>Learning Progress Over Time</h3>
                <div className="chart-wrapper">
                  <Line data={monthlyDownloadsChart} options={chartOptions} />
                </div>
              </div>
            </div>
            
            <div className="progress-stats">
              <div className="stat-item">
                <h4>Current Streak</h4>
                <div className="streak-display">
                  <span className="streak-number">{learningStreak.current}</span>
                  <span className="streak-label">days</span>
                </div>
              </div>
              <div className="stat-item">
                <h4>Best Streak</h4>
                <div className="streak-display">
                  <span className="streak-number">{learningStreak.max}</span>
                  <span className="streak-label">days</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="tab-panel">
            {Object.keys(subjectPerformance).length > 0 ? (
              <div className="charts-grid">
                <div className="chart-container">
                  <h3>Subject Performance</h3>
                  <div className="chart-wrapper">
                    <Bar data={subjectPerformanceChart} options={chartOptions} />
                  </div>
                </div>
                
                <div className="performance-details">
                  <h3>Performance Details</h3>
                  <div className="performance-list">
                    {Object.entries(subjectPerformance).map(([subject, perf]) => (
                      <div key={subject} className="performance-item">
                        <div className="subject-info">
                          <h4>{subject}</h4>
                          <p>{perf.reviewsCount} reviews • {perf.notesCount} notes</p>
                        </div>
                        <div className="rating-display">
                          <div className="stars">
                            {[...Array(5)].map((_, i) => (
                              <i 
                                key={i} 
                                className={`fas fa-star ${i < Math.floor(perf.averageRating) ? 'filled' : ''}`}
                              />
                            ))}
                          </div>
                          <span className="rating-number">{perf.averageRating}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-data">
                <i className="fas fa-star"></i>
                <h3>No Performance Data</h3>
                <p>Start reviewing materials to see your performance analytics.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="tab-panel">
            <div className="activity-section">
              <h3>Recent Activity</h3>
              {recentActivity.length > 0 ? (
                <div className="activity-list">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="activity-item">
                      <div className="activity-icon">
                        <i className="fas fa-download"></i>
                      </div>
                      <div className="activity-content">
                        <h4>{activity.title}</h4>
                        <p>{activity.subject} • {activity.grade}</p>
                        <span className="activity-date">{formatDate(activity.date, { format: 'relative' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-data">
                  <i className="fas fa-history"></i>
                  <h3>No Recent Activity</h3>
                  <p>Your recent downloads will appear here.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressAnalytics;
