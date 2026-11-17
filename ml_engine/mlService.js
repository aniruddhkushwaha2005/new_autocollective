import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { predictTree, trainAllModels } from './trainModels.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const priceModelPath = path.resolve(__dirname, './artifacts/price_model.json');
const demandModelPath = path.resolve(__dirname, './artifacts/demand_model.json');

let cachedPriceModel = null;
let cachedDemandModel = null;

function loadModels() {
  if (!cachedPriceModel && fs.existsSync(priceModelPath)) {
    cachedPriceModel = JSON.parse(fs.readFileSync(priceModelPath, 'utf8'));
  }
  if (!cachedDemandModel && fs.existsSync(demandModelPath)) {
    cachedDemandModel = JSON.parse(fs.readFileSync(demandModelPath, 'utf8'));
  }
}

export function ensureModelsTrained() {
  if (!fs.existsSync(priceModelPath) || !fs.existsSync(demandModelPath)) {
    trainAllModels();
  }
  loadModels();
}

export function retrainModels() {
  cachedPriceModel = null;
  cachedDemandModel = null;
  const summary = trainAllModels();
  loadModels();
  return summary;
}

export function getMlStatus() {
  loadModels();
  return {
    priceModelReady: Boolean(cachedPriceModel),
    demandModelReady: Boolean(cachedDemandModel),
    priceModelMeta: cachedPriceModel
      ? {
          trainedAt: cachedPriceModel.trainedAt,
          selectedModel: cachedPriceModel.selectedModel,
          modelComparison: cachedPriceModel.modelComparison,
          trainSize: cachedPriceModel.trainSize,
          testSize: cachedPriceModel.testSize,
          featureImportance: cachedPriceModel.featureImportance,
          datasetNotice: cachedPriceModel.datasetNotice,
          availableOptions: {
            brands: cachedPriceModel.encoders.brands,
            models: cachedPriceModel.encoders.models,
            fuels: cachedPriceModel.encoders.fuels,
            transmissions: cachedPriceModel.encoders.transmissions,
            cities: cachedPriceModel.encoders.cities
          }
        }
      : null,
    demandModelMeta: cachedDemandModel
      ? {
          trainedAt: cachedDemandModel.trainedAt,
          totalRecords: cachedDemandModel.totalRecords,
          evaluationMetrics: cachedDemandModel.evaluationMetrics,
          datasetNotice: cachedDemandModel.datasetNotice
        }
      : null
  };
}

export function predictCarPrice(input) {
  loadModels();
  if (!cachedPriceModel) {
    return {
      modelReady: false,
      message: 'Price prediction model is not trained yet. Run training before requesting predictions.'
    };
  }

  const enc = cachedPriceModel.encoders;
  const exShowroom = Number(input.exShowroomLakh || enc.modelBaseMap[input.model] || 12.5);
  const year = Number(input.year || 2026);
  const age = Math.max(0, 2026 - year);
  const kmDriven = Number(input.kmDriven || 0);
  const mileageKmpl = Number(input.mileageKmpl || 18.0);
  const cityRto = enc.cityRtoIndex[input.city] || 1.13;
  const fuelCode = Math.max(0, enc.fuels.indexOf(input.fuelType));
  const transCode = Math.max(0, enc.transmissions.indexOf(input.transmission));
  const brandCode = Math.max(0, enc.brands.indexOf(input.brand));
  const modelAvgEx = enc.modelBaseMap[input.model] || exShowroom;

  const featureVector = [
    exShowroom,
    age,
    kmDriven / 1000,
    mileageKmpl,
    cityRto,
    fuelCode,
    transCode,
    brandCode,
    modelAvgEx
  ];

  // Random Forest individual tree predictions to derive genuine prediction interval
  const treePreds = cachedPriceModel.randomForest.trees.map((t) => predictTree(t, featureVector));
  treePreds.sort((a, b) => a - b);
  const rfEstimate = treePreds.reduce((a, b) => a + b, 0) / treePreds.length;

  // Gradient Boosted estimate
  let boostEstimate = cachedPriceModel.gradientBoosting.baseMean;
  for (const t of cachedPriceModel.gradientBoosting.trees) {
    boostEstimate += cachedPriceModel.gradientBoosting.learningRate * predictTree(t, featureVector);
  }

  // Ridge estimate
  const rw = cachedPriceModel.ridgeWeights;
  const ridgeEstimate = rw[0] + featureVector.reduce((s, val, idx) => s + val * rw[idx + 1], 0);

  // Selected model primary prediction
  const primary =
    cachedPriceModel.selectedModel === 'Gradient Boosted Regressor'
      ? boostEstimate
      : cachedPriceModel.selectedModel === 'Ridge Linear Regression'
        ? ridgeEstimate
        : rfEstimate;

  const p10 = treePreds[Math.floor(treePreds.length * 0.1)] || primary * 0.94;
  const p90 = treePreds[Math.floor(treePreds.length * 0.9)] || primary * 1.06;
  const lowerBound = Number(Math.min(p10, primary * 0.96).toFixed(2));
  const upperBound = Number(Math.max(p90, primary * 1.04).toFixed(2));
  const spreadRatio = (upperBound - lowerBound) / Math.max(1, primary);
  const confidenceScore = Number(Math.max(0.65, Math.min(0.95, 1 - spreadRatio * 1.4)).toFixed(2));

  const dealerQuotation = input.dealerQuotationLakh ? Number(input.dealerQuotationLakh) : null;
  const priceDifference = dealerQuotation !== null ? Number((dealerQuotation - primary).toFixed(2)) : null;

  return {
    modelReady: true,
    selectedModel: cachedPriceModel.selectedModel,
    predictedPriceLakh: Number(primary.toFixed(2)),
    lowerRangeLakh: lowerBound,
    upperRangeLakh: upperBound,
    confidenceScore,
    modelPredictions: {
      randomForestLakh: Number(rfEstimate.toFixed(2)),
      gradientBoostedLakh: Number(boostEstimate.toFixed(2)),
      ridgeRegressionLakh: Number(ridgeEstimate.toFixed(2))
    },
    dealerQuotationLakh: dealerQuotation,
    priceDifferenceLakh: priceDifference,
    featureImportance: cachedPriceModel.featureImportance,
    evaluation: cachedPriceModel.modelComparison,
    limitations:
      'Estimates reflect historical patterns from the development dataset and do not represent guaranteed dealership quotes or live RTO tax changes.'
  };
}

export function forecastCarDemand({ city = 'All', model = 'All', horizonMonths = 4 } = {}) {
  loadModels();
  if (!cachedDemandModel) {
    return {
      modelReady: false,
      message: 'Demand forecasting model is not trained yet.'
    };
  }

  const allSeries = Object.values(cachedDemandModel.seriesModels);
  const filtered = allSeries.filter(
    (s) => (city === 'All' || s.city === city) && (model === 'All' || s.model === model)
  );

  if (filtered.length === 0) {
    return {
      modelReady: true,
      timeline: [],
      cityComparison: [],
      popularModels: [],
      evaluationMetrics: cachedDemandModel.evaluationMetrics,
      datasetNotice: cachedDemandModel.datasetNotice
    };
  }

  // Aggregate 18 months of historical actuals
  const monthBuckets = {};
  for (const s of filtered) {
    for (const h of s.history) {
      if (!monthBuckets[h.month]) {
        monthBuckets[h.month] = {
          month: h.month,
          monthIndex: h.monthIndex,
          actualDemand: 0,
          forecastDemand: null,
          groupsFormed: 0,
          type: 'historical'
        };
      }
      monthBuckets[h.month].actualDemand += h.buyerRequests;
      monthBuckets[h.month].groupsFormed += h.groupsFormed;
    }
  }

  const timeline = Object.values(monthBuckets).sort((a, b) => a.monthIndex - b.monthIndex);

  // Add future forecasted months
  const lastIdx = timeline[timeline.length - 1].monthIndex;
  const [lastYear, lastMon] = timeline[timeline.length - 1].month.split('-').map(Number);

  for (let h = 1; h <= horizonMonths; h++) {
    const totalMonths = lastYear * 12 + (lastMon - 1) + h;
    const fYear = Math.floor(totalMonths / 12);
    const fMon = (totalMonths % 12) + 1;
    const fLabel = `${fYear}-${String(fMon).padStart(2, '0')}`;
    const fIdx = lastIdx + h;

    let forecastTotal = 0;
    for (const s of filtered) {
      const season = s.seasonalFactors[fMon] || 1.0;
      const pred = Math.max(2, (s.intercept + s.slope * fIdx) * season);
      forecastTotal += Math.round(pred);
    }

    timeline.push({
      month: fLabel,
      monthIndex: fIdx,
      actualDemand: null,
      forecastDemand: forecastTotal,
      groupsFormed: Math.max(1, Math.round(forecastTotal / 4.5)),
      type: 'forecast'
    });
  }

  // City-wise demand comparison (Latest month vs Next month forecast)
  const cityMap = {};
  for (const s of allSeries) {
    if (model !== 'All' && s.model !== model) continue;
    if (!cityMap[s.city]) {
      cityMap[s.city] = { city: s.city, currentMonthRequests: 0, nextMonthForecast: 0 };
    }
    const lastActual = s.history[s.history.length - 1].buyerRequests;
    const nextMon = (lastMon % 12) + 1;
    const nextForecast = Math.max(
      2,
      Math.round((s.intercept + s.slope * (s.lastMonthIndex + 1)) * (s.seasonalFactors[nextMon] || 1.0))
    );
    cityMap[s.city].currentMonthRequests += lastActual;
    cityMap[s.city].nextMonthForecast += nextForecast;
  }

  const cityComparison = Object.values(cityMap)
    .map((c) => {
      const growthPct = Number(
        (((c.nextMonthForecast - c.currentMonthRequests) / Math.max(1, c.currentMonthRequests)) * 100).toFixed(1)
      );
      return {
        ...c,
        growthPct,
        indicator: growthPct >= 5 ? 'High Demand' : growthPct <= -2 ? 'Softening' : 'Steady'
      };
    })
    .sort((a, b) => b.nextMonthForecast - a.nextMonthForecast);

  // Popular models ranking
  const modelMap = {};
  for (const s of allSeries) {
    if (city !== 'All' && s.city !== city) continue;
    if (!modelMap[s.model]) {
      modelMap[s.model] = { model: s.model, brand: s.brand, recentRequests: 0, nextForecast: 0 };
    }
    const lastActual = s.history[s.history.length - 1].buyerRequests;
    const nextMon = (lastMon % 12) + 1;
    const nextForecast = Math.max(
      2,
      Math.round((s.intercept + s.slope * (s.lastMonthIndex + 1)) * (s.seasonalFactors[nextMon] || 1.0))
    );
    modelMap[s.model].recentRequests += lastActual;
    modelMap[s.model].nextForecast += nextForecast;
  }

  const popularModels = Object.values(modelMap)
    .map((m) => ({
      ...m,
      demandLevel: m.nextForecast >= 95 ? 'High Demand' : m.nextForecast >= 65 ? 'Moderate' : 'Low Demand'
    }))
    .sort((a, b) => b.nextForecast - a.nextForecast);

  return {
    modelReady: true,
    timeline,
    cityComparison,
    popularModels,
    evaluationMetrics: cachedDemandModel.evaluationMetrics,
    datasetNotice: cachedDemandModel.datasetNotice,
    availableCities: [...new Set(allSeries.map((s) => s.city))],
    availableModels: [...new Set(allSeries.map((s) => s.model))]
  };
}
