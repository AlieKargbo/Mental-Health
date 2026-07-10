// src/components/TimelineChart.tsx
import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';

// Register all necessary components for Chart.js
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend
);

interface CheckinData {
  id: string;
  timestamp: string;
  sentiment_score: number;
  anomaly_flag: boolean;
  user_text?: string;
}

interface TimelineChartProps {
  refreshKey: number;
  entries: CheckinData[];
}

const TimelineChart: React.FC<TimelineChartProps> = ({ refreshKey, entries }) => {
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    const formatData = () => {
      if (!entries || entries.length === 0) {
        setChartData(null);
        return;
      }

      // Sort entries by timestamp
      const sortedEntries = [...entries].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      // --- Data Formatting for Chart.js ---
      const labels = sortedEntries.map(d => {
        const date = new Date(d.timestamp);
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit', 
          minute: '2-digit' 
        });
      });
      
      const scores = sortedEntries.map(d => (d.sentiment_score * 100)); // Scale to 0-100 for better chart display
      
      // Create point colors based on anomaly flags and sentiment scores
      const pointColors = sortedEntries.map(d => {
        if (d.anomaly_flag) return 'rgb(239, 68, 68)'; // Red for anomalies
        if (d.sentiment_score > 0.7) return 'rgb(34, 197, 94)'; // Green for high sentiment
        if (d.sentiment_score < 0.3) return 'rgb(251, 146, 60)'; // Orange for low sentiment
        return 'rgb(59, 130, 246)'; // Blue for neutral
      });

      const chartJsData = {
        labels,
        datasets: [
          {
            label: 'Sentiment Score (0-100)',
            data: scores,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            pointBackgroundColor: pointColors,
            pointBorderColor: pointColors,
            pointBorderWidth: 2,
            pointRadius: 7,
            pointHoverRadius: 10,
            pointHoverBorderWidth: 3,
            tension: 0.3,
            fill: true,
            borderWidth: 3,
          },
        ],
      };
      setChartData(chartJsData);
    };

    formatData();
  }, [entries, refreshKey]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 20,    // Add padding at the top
        bottom: 10,
        left: 10,
        right: 10
      }
    },
    plugins: {
      legend: { 
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15
        }
      },
      title: { 
        display: false // Title is handled by parent component
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = Math.round(context.parsed.y);
            return `Sentiment: ${value}%`;
          },
          afterLabel: function(context: any) {
            const entry = entries[context.dataIndex];
            if (entry?.anomaly_flag) {
              return 'Anomaly detected - Consider seeking support';
            }
            return '';
          }
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 105, // Add 5% padding at the top to ensure 100% values are visible
        title: {
          display: true,
          text: 'Sentiment Score (%)'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          stepSize: 10,
          callback: function(value: any) {
            // Only show ticks from 0 to 100, hide the 105 padding
            return value <= 100 ? value + '%' : '';
          }
        },
        // Add a reference line at 100%
        afterDatasetsDraw: function(chart: any) {
          const ctx = chart.ctx;
          const yAxis = chart.scales.y;
          const xAxis = chart.scales.x;
          
          // Draw 100% reference line
          const y100 = yAxis.getPixelForValue(100);
          ctx.save();
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)'; // Green color
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(xAxis.left, y100);
          ctx.lineTo(xAxis.right, y100);
          ctx.stroke();
          ctx.restore();
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          maxRotation: 45,
          minRotation: 0
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };



  if (!chartData || !entries || entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-lg font-medium">No check-in data available yet</p>
        <p className="text-sm">Submit your first entry to see your sentiment timeline!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart Container with adequate height */}
      <div className="h-80 w-full">
        <Line data={chartData} options={options} />
      </div>
      
      {/* Chart Statistics */}
      <div className="flex justify-between items-center text-xs text-gray-500 px-2">
        <span>
          Range: {entries.length > 0 ? `${Math.round(Math.min(...entries.map(e => e.sentiment_score * 100)))}% - ${Math.round(Math.max(...entries.map(e => e.sentiment_score * 100)))}%` : 'No data'}
        </span>
        <span>
          Entries: {entries.length}
        </span>
      </div>

      {/* Chart Legend */}
      <div className="flex flex-wrap justify-center gap-4 text-sm pt-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
          <span>Anomaly Detected</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
          <span>High Sentiment (70%+)</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
          <span>Low Sentiment (30%-)</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
          <span>Neutral Sentiment</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 border-2 border-green-500 border-dashed rounded mr-2"></div>
          <span>100% Reference Line</span>
        </div>
      </div>
    </div>
  );
};

export default TimelineChart;