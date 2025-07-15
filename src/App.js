import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChevronDown } from 'lucide-react';

function App() {
  // Google Apps Script Configuration
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxAuhixB_XwnU_MRtvG049ah5FjPS8CZSTqbuKsfPzDwiN4gEi19QR_zj0HAKYGC7I9/exec';

  // BOR PRE-APPROVED RATES (from your spreadsheet Row 4)
  const BOR_APPROVED_RATES = {
    'FY25': 5.5,
    'FY26': 5.0,
    'FY27': 4.5,
    'FY28': 6.0,
    'FY29': 9.0
    // FY30+ do not have board approved rates yet
  };

  // State for data loaded from Google Sheets
  const [historicalRoomRates, setHistoricalRoomRates] = useState([]);
  const [currentRatesFromSheet, setCurrentRatesFromSheet] = useState({ single: 4192, double: 3341 });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Default fallback data
  const defaultHistoricalRoomRates = [
    { year: 'FY11', single: 3748.55, double: 2987.57, actualCPI: 0.0102 },
    { year: 'FY12', single: 3804.78, double: 3032.38, actualCPI: 0.0231 },
    { year: 'FY13', single: 3918.92, double: 3123.36, actualCPI: 0.0227 },
    { year: 'FY14', single: 3985.54, double: 3985.54, actualCPI: 0.0284 },
    { year: 'FY15', single: 4045.32, double: 3224.10, actualCPI: 0.0290 },
    { year: 'FY16', single: 4077.69, double: 3249.89, actualCPI: 0.0336 },
    { year: 'FY17', single: 4106.23, double: 3272.64, actualCPI: 0.0335 },
    { year: 'FY18', single: 4192.46, double: 3341.37, actualCPI: 0.0349 },
    { year: 'FY19', single: 4280.50, double: 3411.54, actualCPI: 0.0333 },
    { year: 'FY20', single: 4361.83, double: 3476.35, actualCPI: 0.0251 },
    { year: 'FY21', single: 4462.15, double: 3556.31, actualCPI: 0.0220 },
    { year: 'FY22', single: 4524.62, double: 3606.10, actualCPI: 0.0545 },
    { year: 'FY23', single: 4841.35, double: 3858.53, actualCPI: 0.0802 },
    { year: 'FY24', single: 5156.03, double: 4109.33, actualCPI: 0.0539 },
    { year: 'FY25', single: 5305.56, double: 4228.50, actualCPI: 0.0387 },
    { year: 'FY26', single: 5438.20, double: 4334.21, actualCPI: 0 },
    { year: 'FY27', single: 5563.28, double: 4433.90, actualCPI: 0 },
    { year: 'FY28', single: 5685.67, double: 4531.45, actualCPI: 0 },
    { year: 'FY29', single: 5805.07, double: 4626.61, actualCPI: 0 },
    { year: 'FY30', single: 5921.32, double: 4719.26, actualCPI: 0 }
  ];

  // Baseline data
  const baseline2010 = { single: 3748.55, double: 2987.57 };

  // Target rates (from FY25 historical data)
  const targetRates = {
    single: 5305.56,
    double: 4228.50
  };

  // Helper to check if a year has BOR approved rate
  const hasBORRate = (year) => BOR_APPROVED_RATES.hasOwnProperty(year);
  const getBORRate = (year) => BOR_APPROVED_RATES[year];
  
  // For years with BOR rates, use that rate; for others, use custom rate
  const getEffectiveRate = (year) => {
    if (hasBORRate(year)) {
      return getBORRate(year);
    }
    return whatIfRate;
  };
  const [adjustedBoardRate, setAdjustedBoardRate] = useState(3500);
  const [roomAnnualIncrease, setRoomAnnualIncrease] = useState(5);
  const [boardAnnualIncrease, setBoardAnnualIncrease] = useState(4);
  const [whatIfRate, setWhatIfRate] = useState(5);
  const [whatIfYear, setWhatIfYear] = useState('FY30');

  // Function to fetch data from Google Apps Script
  const fetchGoogleSheetData = async () => {
    try {
      setLoading(true);
      const response = await fetch(APPS_SCRIPT_URL);
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Handle both old format (just array) and new format (with currentRates)
      if (Array.isArray(data)) {
        // Old format - just historical data
        setHistoricalRoomRates(data);
        setLastUpdated(new Date().toLocaleString());
        console.log('Successfully loaded historical data from Google Apps Script');
      } else if (data.historicalData) {
        // New format - with current rates
        setHistoricalRoomRates(data.historicalData);
        
        if (data.currentRates) {
          setCurrentRatesFromSheet(data.currentRates);
          console.log('Current rates from I45/I46:', data.currentRates);
        }
        
        setLastUpdated(new Date().toLocaleString());
        console.log('Successfully loaded data from Google Apps Script');
      } else {
        throw new Error('Invalid data structure from Apps Script');
      }
      
    } catch (error) {
      console.error('Error fetching Google Apps Script data:', error);
      setHistoricalRoomRates(defaultHistoricalRoomRates);
      setCurrentRatesFromSheet({ single: 4192, double: 3341 });
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchGoogleSheetData();
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchGoogleSheetData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Available years for dropdown
  const availableYears = historicalRoomRates.length > 0 ? historicalRoomRates.map(rate => rate.year) : ['FY25'];

  // Calculate metrics using Google Sheet values directly
  const singleGap = (targetRates.single || 0) - (currentRatesFromSheet.single || 0);
  const doubleGap = (targetRates.double || 0) - (currentRatesFromSheet.double || 0);
  const boardBaseline2010 = 2500;
  const currentBoardTarget = 4200;
  const boardGap = currentBoardTarget - adjustedBoardRate;

  // Safe formatting functions
  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '$0';
    return `$${Number(value).toLocaleString()}`;
  };

  const formatNumber = (value, decimals = 1) => {
    if (value === null || value === undefined || isNaN(value)) return '0';
    return Number(value).toFixed(decimals);
  };

  // FIXED: What-If Calculator that respects BOR rates for FY25-30, then applies custom rate
  const calculateWhatIfRecovery = (currentRate, baselineRate, annualRate, targetYear) => {
    const yearOrder = ['FY25', 'FY26', 'FY27', 'FY28', 'FY29', 'FY30'];
    const currentYearIndex = yearOrder.indexOf('FY25');
    const targetYearIndex = yearOrder.indexOf(targetYear);
    
    if (targetYearIndex === -1 || targetYearIndex <= currentYearIndex) {
      return {
        projectedRate: currentRate,
        inflationAdjustedBaseline: baselineRate * 1.415,
        fullRecovery: currentRate >= (baselineRate * 1.415),
        yearByYearBreakdown: [{ year: 'FY25', rate: currentRate, appliedRate: 'Current' }]
      };
    }
    
    // Apply BOR rates through FY30, then custom rate for years beyond
    let projectedRate = currentRate;
    const yearByYearBreakdown = [];
    
    for (let i = currentYearIndex; i <= targetYearIndex; i++) {
      const year = yearOrder[i];
      
      if (i === currentYearIndex) {
        // Starting year
        yearByYearBreakdown.push({ 
          year, 
          rate: projectedRate, 
          appliedRate: 'Starting Rate' 
        });
      } else if (BOR_APPROVED_RATES[year]) {
        // Use BOR rate if available
        const borRate = BOR_APPROVED_RATES[year];
        projectedRate = projectedRate * (1 + (borRate / 100));
        yearByYearBreakdown.push({ 
          year, 
          rate: projectedRate, 
          appliedRate: `${borRate}% (BOR)` 
        });
      } else {
        // Use custom rate for years beyond BOR approval
        projectedRate = projectedRate * (1 + (annualRate / 100));
        yearByYearBreakdown.push({ 
          year, 
          rate: projectedRate, 
          appliedRate: `${annualRate}% (Custom)` 
        });
      }
    }
    
    const inflationAdjustedBaseline = baselineRate * 1.415;
    
    return {
      projectedRate,
      inflationAdjustedBaseline,
      fullRecovery: projectedRate >= inflationAdjustedBaseline,
      stillToRecover: Math.max(0, inflationAdjustedBaseline - projectedRate),
      yearByYearBreakdown
    };
  };

  // NEW: BOR Rate Calculator function
  const calculateBORProjection = (currentRate, baselineRate, targetYear) => {
    const yearOrder = ['FY25', 'FY26', 'FY27', 'FY28', 'FY29', 'FY30'];
    const currentYearIndex = yearOrder.indexOf('FY25');
    const targetYearIndex = yearOrder.indexOf(targetYear);
    
    if (targetYearIndex === -1 || targetYearIndex <= currentYearIndex) {
      return {
        projectedRate: currentRate,
        inflationAdjustedBaseline: baselineRate * 1.415,
        fullRecovery: currentRate >= (baselineRate * 1.415),
        yearByYearBreakdown: [{ year: 'FY25', rate: currentRate, borRate: BOR_APPROVED_RATES['FY25'] }]
      };
    }
    
    // Calculate year-by-year using BOR rates
    let projectedRate = currentRate;
    const yearByYearBreakdown = [];
    
    for (let i = currentYearIndex; i <= targetYearIndex; i++) {
      const year = yearOrder[i];
      const borRate = BOR_APPROVED_RATES[year];
      
      if (i === currentYearIndex) {
        yearByYearBreakdown.push({ year, rate: projectedRate, borRate });
      } else {
        projectedRate = projectedRate * (1 + (borRate / 100));
        yearByYearBreakdown.push({ year, rate: projectedRate, borRate });
      }
    }
    
    const inflationAdjustedBaseline = baselineRate * 1.415;
    
    return {
      projectedRate,
      inflationAdjustedBaseline,
      fullRecovery: projectedRate >= inflationAdjustedBaseline,
      stillToRecover: Math.max(0, inflationAdjustedBaseline - projectedRate),
      yearByYearBreakdown
    };
  };

  // Original what-if calculations (custom rate)
  const whatIfSingle = calculateWhatIfRecovery(currentRatesFromSheet.single, baseline2010.single, whatIfRate, whatIfYear);
  const whatIfDouble = calculateWhatIfRecovery(currentRatesFromSheet.double, baseline2010.double, whatIfRate, whatIfYear);
  const whatIfBoard = calculateWhatIfRecovery(adjustedBoardRate, boardBaseline2010, whatIfRate, whatIfYear);

  // NEW: BOR projections
  const borSingle = calculateBORProjection(currentRatesFromSheet.single, baseline2010.single, whatIfYear);
  const borDouble = calculateBORProjection(currentRatesFromSheet.double, baseline2010.double, whatIfYear);
  const borBoard = calculateBORProjection(adjustedBoardRate, boardBaseline2010, whatIfYear);

  // Chart data with BOR approved rates
  const combinedChartData = historicalRoomRates.length > 0 
    ? historicalRoomRates.slice(-8).map((item) => {
        return {
          year: item.year || '',
          'Room Single': Math.round(item.single || 0),
          'Room Double': Math.round(item.double || 0),
          'BOR Rate': BOR_APPROVED_RATES[item.year] || null,
        };
      })
    : [];

  if (loading && historicalRoomRates.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 flex items-center space-x-4 shadow-lg">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-lg font-medium">Loading Google Sheets data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-bold text-gray-800">Room & Board Rate Calculator</h1>
          <button
            onClick={fetchGoogleSheetData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Updating...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh Data</span>
              </>
            )}
          </button>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Sliders auto-sync with Google Sheet I45/I46 values</p>
          <div className="text-sm text-gray-500">
            {lastUpdated ? (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Last updated: {lastUpdated}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>Using default data</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOR Rates Display */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-lg p-6 mb-6 border-2 border-blue-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">BOR Pre-Approved Rates (FY25-29 Fixed)</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(BOR_APPROVED_RATES).map(([year, rate]) => (
            <div key={year} className="text-center p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="text-sm font-medium text-gray-600">{year}</div>
              <div className="text-lg font-bold text-blue-600">{rate}%</div>
            </div>
          ))}
          <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200 shadow-sm">
            <div className="text-sm font-medium text-gray-600">FY30+</div>
            <div className="text-lg font-bold text-orange-600">Custom</div>
          </div>
        </div>
      </div>

      {/* Rate Adjustment Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Single Room Rate</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Rate: {formatCurrency(currentRatesFromSheet.single)} <span className="text-xs text-blue-600 font-semibold">(synced with I45)</span>
              </label>
              <input
                type="range"
                min="3500"
                max="10000"
                value={currentRatesFromSheet.single}
                onChange={(e) => setCurrentRatesFromSheet(prev => ({ ...prev, single: parseInt(e.target.value) }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>$3,500</span>
                <span>$10,000</span>
              </div>
            </div>
            <div className="p-4 rounded-lg border-2 bg-blue-50 border-blue-200">
              <div className="flex justify-between items-center">
                <span className="font-medium">Target Rate:</span>
                <span className="font-bold">{formatCurrency(targetRates.single)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Gap:</span>
                <span className={`font-bold ${currentRatesFromSheet.single >= targetRates.single ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(singleGap))} ({formatNumber(Math.abs(singleGap / currentRatesFromSheet.single * 100))}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Double Room Rate</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Rate: {formatCurrency(currentRatesFromSheet.double)} <span className="text-xs text-purple-600 font-semibold">(synced with I46)</span>
              </label>
              <input
                type="range"
                min="2800"
                max="8000"
                value={currentRatesFromSheet.double}
                onChange={(e) => setCurrentRatesFromSheet(prev => ({ ...prev, double: parseInt(e.target.value) }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>$2,800</span>
                <span>$8,000</span>
              </div>
            </div>
            <div className="p-4 rounded-lg border-2 bg-purple-50 border-purple-200">
              <div className="flex justify-between items-center">
                <span className="font-medium">Target Rate:</span>
                <span className="font-bold">{formatCurrency(targetRates.double)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Gap:</span>
                <span className={`font-bold ${currentRatesFromSheet.double >= targetRates.double ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(doubleGap))} ({formatNumber(Math.abs(doubleGap / currentRatesFromSheet.double * 100))}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Board Rate</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Rate: {formatCurrency(adjustedBoardRate)} <span className="text-xs text-gray-500">(manual adjustment)</span>
              </label>
              <input
                type="range"
                min="2500"
                max="5000"
                value={adjustedBoardRate}
                onChange={(e) => setAdjustedBoardRate(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>$2,500</span>
                <span>$5,000</span>
              </div>
            </div>
            <div className="p-4 rounded-lg border-2 bg-green-50 border-green-200">
              <div className="flex justify-between items-center">
                <span className="font-medium">Target Rate:</span>
                <span className="font-bold">{formatCurrency(currentBoardTarget)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Gap:</span>
                <span className={`font-bold ${adjustedBoardRate >= currentBoardTarget ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(boardGap))} ({formatNumber(Math.abs(boardGap / adjustedBoardRate * 100))}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOR Rate Projections */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-l-4 border-blue-500">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">BOR Rate Projections (Official)</h2>
        <p className="text-sm text-gray-600 mb-4">Using pre-approved rates: FY25(5.5%), FY26(5.0%), FY27(4.5%), FY28(6.0%), FY29(9.0%). FY30+ rates pending approval.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Year for BOR Projections</label>
            <select
              value={whatIfYear}
              onChange={(e) => setWhatIfYear(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg appearance-none bg-white"
            >
              {availableYears.slice(availableYears.indexOf('FY25')).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg border-2 border-blue-200 p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">Single Room BOR Projection</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">Projected by {whatIfYear}:</span>
                <span className="font-bold text-blue-800">{formatCurrency(borSingle.projectedRate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">Inflation-Adjusted Target:</span>
                <span className="font-bold text-blue-800">{formatCurrency(borSingle.inflationAdjustedBaseline)}</span>
              </div>
              <div className="border-t border-blue-300 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700">Status:</span>
                  <span className={`font-bold ${borSingle.fullRecovery ? 'text-green-600' : 'text-red-600'}`}>
                    {borSingle.fullRecovery ? '✓ Fully Recovered' : formatCurrency(borSingle.stillToRecover)}
                  </span>
                </div>
              </div>
              {borSingle.yearByYearBreakdown && (
                <div className="border-t border-blue-300 pt-3">
                  <div className="text-xs text-blue-600 font-semibold mb-2">Year-by-Year BOR Breakdown:</div>
                  {borSingle.yearByYearBreakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-blue-700">
                      <span>{item.year}: {item.borRate}%</span>
                      <span>{formatCurrency(item.rate)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg border-2 border-purple-200 p-6">
            <h3 className="text-lg font-semibold text-purple-800 mb-4">Double Room BOR Projection</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-700">Projected by {whatIfYear}:</span>
                <span className="font-bold text-purple-800">{formatCurrency(borDouble.projectedRate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-700">Inflation-Adjusted Target:</span>
                <span className="font-bold text-purple-800">{formatCurrency(borDouble.inflationAdjustedBaseline)}</span>
              </div>
              <div className="border-t border-purple-300 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-purple-700">Status:</span>
                  <span className={`font-bold ${borDouble.fullRecovery ? 'text-green-600' : 'text-red-600'}`}>
                    {borDouble.fullRecovery ? '✓ Fully Recovered' : formatCurrency(borDouble.stillToRecover)}
                  </span>
                </div>
              </div>
              {borDouble.yearByYearBreakdown && (
                <div className="border-t border-purple-300 pt-3">
                  <div className="text-xs text-purple-600 font-semibold mb-2">Year-by-Year BOR Breakdown:</div>
                  {borDouble.yearByYearBreakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-purple-700">
                      <span>{item.year}: {item.borRate}%</span>
                      <span>{formatCurrency(item.rate)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-green-50 rounded-lg border-2 border-green-200 p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-4">Board Rate BOR Projection</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">Projected by {whatIfYear}:</span>
                <span className="font-bold text-green-800">{formatCurrency(borBoard.projectedRate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-700">Inflation-Adjusted Target:</span>
                <span className="font-bold text-green-800">{formatCurrency(borBoard.inflationAdjustedBaseline)}</span>
              </div>
              <div className="border-t border-green-300 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-green-700">Status:</span>
                  <span className={`font-bold ${borBoard.fullRecovery ? 'text-green-600' : 'text-red-600'}`}>
                    {borBoard.fullRecovery ? '✓ Fully Recovered' : formatCurrency(borBoard.stillToRecover)}
                  </span>
                </div>
              </div>
              {borBoard.yearByYearBreakdown && (
                <div className="border-t border-green-300 pt-3">
                  <div className="text-xs text-green-600 font-semibold mb-2">Year-by-Year BOR Breakdown:</div>
                  {borBoard.yearByYearBreakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-green-700">
                      <span>{item.year}: {item.borRate}%</span>
                      <span>{formatCurrency(item.rate)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Original What-If Calculator */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-l-4 border-orange-500">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Custom What-If Calculator</h2>
        <p className="text-sm text-gray-600 mb-4">
          <strong>How it works:</strong> 
          <br />• <strong>FY25-29:</strong> Uses fixed BOR approved rates (rate input locked)
          <br />• <strong>FY30+:</strong> Uses your custom rate input for years beyond board approval
          <br />• Always respects the approved rates for years that have them
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-orange-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {hasBORRate(whatIfYear) ? `Rate for ${whatIfYear} (BOR Fixed)` : 'Custom Annual Rate (%)'}
            </label>
            {hasBORRate(whatIfYear) ? (
              <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 font-semibold text-center">
                {getBORRate(whatIfYear)}% (Board Approved - Cannot Change)
              </div>
            ) : (
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={whatIfRate}
                onChange={(e) => setWhatIfRate(parseFloat(e.target.value) || 0)}
                className="w-full p-3 border border-gray-300 rounded-lg"
                placeholder="5.0"
              />
            )}
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Year</label>
            <select
              value={whatIfYear}
              onChange={(e) => setWhatIfYear(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg appearance-none bg-white"
            >
              {availableYears.slice(availableYears.indexOf('FY25')).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-orange-50 rounded-lg border-2 border-orange-200 p-6">
            <h3 className="text-lg font-semibold text-orange-800 mb-4">Single Room Custom What-If</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-orange-700">Projected by {whatIfYear}:</span>
                <span className="font-bold text-orange-800">{formatCurrency(whatIfSingle.projectedRate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-orange-700">
                  {hasBORRate(whatIfYear) 
                    ? `Uses BOR rate: ${getBORRate(whatIfYear)}%` 
                    : `Uses BOR rates FY25-29, then ${whatIfRate}%`
                  }
                </span>
                <span className="font-bold text-orange-800">{formatCurrency(whatIfSingle.inflationAdjustedBaseline)}</span>
              </div>
              <div className="border-t border-orange-300 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-orange-700">Still to Recover:</span>
                  <span className={`font-bold ${whatIfSingle.fullRecovery ? 'text-green-600' : 'text-red-600'}`}>
                    {whatIfSingle.fullRecovery ? '✓ Fully Recovered' : formatCurrency(whatIfSingle.stillToRecover)}
                  </span>
                </div>
              </div>
              {whatIfSingle.yearByYearBreakdown && (
                <div className="border-t border-orange-300 pt-3">
                  <div className="text-xs text-orange-600 font-semibold mb-2">Rate Breakdown:</div>
                  {whatIfSingle.yearByYearBreakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-orange-700">
                      <span>{item.year}: {item.appliedRate}</span>
                      <span>{formatCurrency(item.rate)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg border-2 border-orange-200 p-6">
            <h3 className="text-lg font-semibold text-orange-800 mb-4">Double Room Custom What-If</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-orange-700">Projected by {whatIfYear}:</span>
                <span className="font-bold text-orange-800">{formatCurrency(whatIfDouble.projectedRate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-orange-700">
                  {hasBORRate(whatIfYear) 
                    ? `Uses BOR rate: ${getBORRate(whatIfYear)}%` 
                    : `Uses BOR rates FY25-29, then ${whatIfRate}%`
                  }
                </span>
                <span className="font-bold text-orange-800">{formatCurrency(whatIfDouble.inflationAdjustedBaseline)}</span>
              </div>
              <div className="border-t border-orange-300 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-orange-700">Still to Recover:</span>
                  <span className={`font-bold ${whatIfDouble.fullRecovery ? 'text-green-600' : 'text-red-600'}`}>
                    {whatIfDouble.fullRecovery ? '✓ Fully Recovered' : formatCurrency(whatIfDouble.stillToRecover)}
                  </span>
                </div>
              </div>
              {whatIfDouble.yearByYearBreakdown && (
                <div className="border-t border-orange-300 pt-3">
                  <div className="text-xs text-orange-600 font-semibold mb-2">Rate Breakdown:</div>
                  {whatIfDouble.yearByYearBreakdown.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-orange-700">
                      <span>{item.year}: {item.appliedRate}</span>
                      <span>{formatCurrency(item.rate)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg border-2 border-orange-200 p-6">
            <h3 className="text-lg font-semibold text-orange-800 mb-4">Board Rate Custom What-If</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-orange-700">Projected by {whatIfYear}:</span>
                <span className="font-bold text-orange-800">{formatCurrency(whatIfBoard.projectedRate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-orange-700">
                  {hasBORRate(whatIfYear) 
                    ? `Uses BOR rate: ${getBORRate(whatIfYear)}%` 
                    : `Uses BOR rates FY25-29, then ${whatIfRate}%`
                  }
                </span>
                <span className="font-bold text-orange-800">{formatCurrency(whatIfBoard.inflationAdjustedBaseline)}</span>
              </div>
              <div className="border-t border-orange-300 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-orange-700">Still to Recover:</span>
                  <span className={`font-bold ${whatIfBoard.fullRecovery ? 'text-green-600' : 'text-red-600'}`}>
                    {whatIfBoard.fullRecovery ? '✓ Fully Recovered' : formatCurrency(whatIfBoard.stillToRecover)}
                  </span>
                </div>
              </div>
              {whatIfBoard.yearByYearBreakdown && (
                <div className="border-t border-orange-300 pt-3">
                  <div className="text-xs text-orange-600 font-semibold mb-2">Rate Breakdown:</div>
                  {whatIfBoard.yearByYearBreakdown.slice(-3).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-orange-700">
                      <span>{item.year}: {item.appliedRate}</span>
                      <span>{formatCurrency(item.rate)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      {combinedChartData.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Room Rate Trends & Year-over-Year Increases</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={combinedChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis 
                yAxisId="dollars" 
                orientation="left" 
                label={{ value: 'Rate ($)', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="percent" 
                orientation="right" 
                label={{ value: 'Increase (%)', angle: 90, position: 'insideRight' }}
                domain={[0, 'dataMax + 2']}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name.includes('%')) {
                    return [`${value}%`, name];
                  }
                  return [`${value?.toLocaleString()}`, name];
                }} 
              />
              <Legend />
              <Line 
                yAxisId="dollars" 
                type="monotone" 
                dataKey="Room Single" 
                stroke="#10b981" 
                strokeWidth={2} 
              />
              <Line 
                yAxisId="dollars" 
                type="monotone" 
                dataKey="Room Double" 
                stroke="#3b82f6" 
                strokeWidth={2} 
              />
              <Line 
                yAxisId="percent" 
                type="monotone" 
                dataKey="Single % Increase" 
                stroke="#f59e0b" 
                strokeWidth={2} 
                strokeDasharray="5 5"
              />
              <Line 
                yAxisId="percent" 
                type="monotone" 
                dataKey="Double % Increase" 
                stroke="#ef4444" 
                strokeWidth={2} 
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Left Y-axis:</strong> Dollar amounts for room rates</p>
            <p><strong>Right Y-axis:</strong> Year-over-year percentage increases (dashed lines)</p>
          </div>
        </div>
      )}

      {/* Current Totals */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Current Totals (Live from Google Sheet)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Single Room</h3>
            <p className="text-3xl font-bold text-blue-600">{formatCurrency(currentRatesFromSheet.single)}</p>
            <p className="text-xs text-gray-500 mt-1">From cell I45</p>
          </div>
          
          <div className="text-center p-6 bg-purple-50 rounded-lg border-2 border-purple-200">
            <h3 className="text-lg font-semibold text-purple-800 mb-2">Double Room</h3>
            <p className="text-3xl font-bold text-purple-600">{formatCurrency(currentRatesFromSheet.double)}</p>
            <p className="text-xs text-gray-500 mt-1">From cell I46</p>
          </div>
          
          <div className="text-center p-6 bg-green-50 rounded-lg border-2 border-green-200">
            <h3 className="text-lg font-semibold text-green-800 mb-2">Total Package</h3>
            <p className="text-4xl font-bold text-green-600">{formatCurrency(currentRatesFromSheet.single + currentRatesFromSheet.double)}</p>
            <p className="text-xs text-gray-500 mt-1">I45 + I46</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
