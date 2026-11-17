import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDatasets } from './generateDatasets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const datasetsDir = path.resolve(__dirname, '../backend/datasets');
const artifactsDir = path.resolve(__dirname, './artifacts');

function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  const headers = raw[0].split(',').map((h) => h.trim());
  return raw.slice(1).map((line) => {
    const vals = line.split(',').map((v) => v.trim());
    const obj = {};
    headers.forEach((h, i) => {
      const v = vals[i];
      obj[h] = v !== '' && !Number.isNaN(Number(v)) ? Number(v) : v;
    });
    return obj;
  });
}

function createRng(seed = 1337) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Compute regression evaluation metrics
function evaluateMetrics(yTrue, yPred) {
  const n = yTrue.length;
  const meanY = yTrue.reduce((a, b) => a + b, 0) / n;
  let ssRes = 0;
  let ssTot = 0;
  let absErr = 0;
  for (let i = 0; i < n; i++) {
    const err = yTrue[i] - yPred[i];
    ssRes += err * err;
    ssTot += (yTrue[i] - meanY) * (yTrue[i] - meanY);
    absErr += Math.abs(err);
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const mae = absErr / n;
  const rmse = Math.sqrt(ssRes / n);
  return {
    r2: Number(r2.toFixed(4)),
    mae: Number(mae.toFixed(3)),
    rmse: Number(rmse.toFixed(3))
  };
}

// CART Decision Tree Regressor for Random Forest & Gradient Boosting
function buildTree(X, y, featureIndices, maxDepth, minSamplesSplit, depth = 0) {
  const n = y.length;
  const mean = y.reduce((a, b) => a + b, 0) / n;
  if (depth >= maxDepth || n < minSamplesSplit) {
    return { leaf: true, value: Number(mean.toFixed(4)) };
  }

  let bestFeature = -1;
  let bestThreshold = 0;
  let bestScore = Infinity;

  const parentSum = y.reduce((a, b) => a + b, 0);

  for (const fIdx of featureIndices) {
    const pairs = X.map((row, idx) => ({ val: row[fIdx], y: y[idx] })).sort((a, b) => a.val - b.val);
    let leftSum = 0;
    let leftSqSum = 0;
    let rightSum = parentSum;
    let rightSqSum = y.reduce((s, v) => s + v * v, 0);

    for (let i = 0; i < n - 1; i++) {
      const yi = pairs[i].y;
      leftSum += yi;
      leftSqSum += yi * yi;
      rightSum -= yi;
      rightSqSum -= yi * yi;

      if (pairs[i].val === pairs[i + 1].val) continue;
      const leftCount = i + 1;
      const rightCount = n - leftCount;
      if (leftCount < 2 || rightCount < 2) continue;

      const leftVar = leftSqSum - (leftSum * leftSum) / leftCount;
      const rightVar = rightSqSum - (rightSum * rightSum) / rightCount;
      const sse = leftVar + rightVar;

      if (sse < bestScore) {
        bestScore = sse;
        bestFeature = fIdx;
        bestThreshold = (pairs[i].val + pairs[i + 1].val) / 2;
      }
    }
  }

  if (bestFeature === -1) {
    return { leaf: true, value: Number(mean.toFixed(4)) };
  }

  const leftX = [];
  const leftY = [];
  const rightX = [];
  const rightY = [];

  for (let i = 0; i < n; i++) {
    if (X[i][bestFeature] <= bestThreshold) {
      leftX.push(X[i]);
      leftY.push(y[i]);
    } else {
      rightX.push(X[i]);
      rightY.push(y[i]);
    }
  }

  return {
    leaf: false,
    feature: bestFeature,
    threshold: Number(bestThreshold.toFixed(4)),
    left: buildTree(leftX, leftY, featureIndices, maxDepth, minSamplesSplit, depth + 1),
    right: buildTree(rightX, rightY, featureIndices, maxDepth, minSamplesSplit, depth + 1)
  };
}

export function predictTree(node, row) {
  let curr = node;
  while (!curr.leaf) {
    curr = row[curr.feature] <= curr.threshold ? curr.left : curr.right;
  }
  return curr.value;
}

// Ridge Regression solver (normal equations with L2 penalty)
function fitRidgeRegression(X, y, alpha = 1.0) {
  const n = X.length;
  const d = X[0].length;
  // Augment X with bias 1
  const Xa = X.map((r) => [1, ...r]);
  const cols = d + 1;
  const A = Array.from({ length: cols }, () => Array(cols).fill(0));
  const b = Array(cols).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < cols; j++) {
      b[j] += Xa[i][j] * y[i];
      for (let k = 0; k < cols; k++) {
        A[j][k] += Xa[i][j] * Xa[i][k];
      }
    }
  }
  for (let j = 1; j < cols; j++) {
    A[j][j] += alpha;
  }

  // Gaussian elimination
  for (let i = 0; i < cols; i++) {
    let maxRow = i;
    for (let k = i + 1; k < cols; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
    }
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    [b[i], b[maxRow]] = [b[maxRow], b[i]];
    const pivot = A[i][i] || 1e-9;
    for (let k = i + 1; k < cols; k++) {
      const factor = A[k][i] / pivot;
      b[k] -= factor * b[i];
      for (let j = i; j < cols; j++) {
        A[k][j] -= factor * A[i][j];
      }
    }
  }

  const w = Array(cols).fill(0);
  for (let i = cols - 1; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < cols; j++) sum -= A[i][j] * w[j];
    w[i] = sum / (A[i][i] || 1e-9);
  }
  return w;
}

export function trainAllModels() {
  fs.mkdirSync(artifactsDir, { recursive: true });
  const carsCsv = path.join(datasetsDir, 'indian_cars_dataset.csv');
  const demandCsv = path.join(datasetsDir, 'historical_demand.csv');
  if (!fs.existsSync(carsCsv) || !fs.existsSync(demandCsv)) {
    ensureDatasets();
  }

  const carRecords = parseCsv(carsCsv);
  const demandRecords = parseCsv(demandCsv);
  const rng = createRng(9911);

  // Build categorical target/ordinal encodings from training data
  const brands = [...new Set(carRecords.map((r) => r.brand))].sort();
  const models = [...new Set(carRecords.map((r) => r.model))].sort();
  const fuels = [...new Set(carRecords.map((r) => r.fuel_type))].sort();
  const transmissions = [...new Set(carRecords.map((r) => r.transmission))].sort();
  const cities = [...new Set(carRecords.map((r) => r.city))].sort();

  const cityRtoIndex = {};
  cities.forEach((c) => {
    const subset = carRecords.filter((r) => r.city === c);
    cityRtoIndex[c] =
      subset.reduce((s, r) => s + r.market_price_lakh / Math.max(1, r.ex_showroom_lakh), 0) / subset.length;
  });

  const modelBaseMap = {};
  models.forEach((m) => {
    const subset = carRecords.filter((r) => r.model === m);
    modelBaseMap[m] = subset.reduce((s, r) => s + r.ex_showroom_lakh, 0) / subset.length;
  });

  const featureNames = [
    'ex_showroom_lakh',
    'vehicle_age',
    'km_driven_k',
    'mileage_kmpl',
    'city_rto_factor',
    'fuel_code',
    'transmission_code',
    'brand_code',
    'model_avg_ex'
  ];

  const encodeRow = (r) => [
    r.ex_showroom_lakh,
    Math.max(0, 2026 - r.year),
    r.km_driven / 1000,
    r.mileage_kmpl,
    cityRtoIndex[r.city] || 1.12,
    fuels.indexOf(r.fuel_type),
    transmissions.indexOf(r.transmission),
    brands.indexOf(r.brand),
    modelBaseMap[r.model] || r.ex_showroom_lakh
  ];

  // Shuffle deterministically & split 80/20
  const indices = carRecords.map((_, idx) => idx);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const splitIdx = Math.floor(indices.length * 0.8);
  const trainIdx = indices.slice(0, splitIdx);
  const testIdx = indices.slice(splitIdx);

  const XTrain = trainIdx.map((i) => encodeRow(carRecords[i]));
  const yTrain = trainIdx.map((i) => carRecords[i].market_price_lakh);
  const XTest = testIdx.map((i) => encodeRow(carRecords[i]));
  const yTest = testIdx.map((i) => carRecords[i].market_price_lakh);

  // 1. Random Forest Regressor (24 trees)
  const numTrees = 24;
  const rfTrees = [];
  for (let t = 0; t < numTrees; t++) {
    const sampleX = [];
    const sampleY = [];
    for (let i = 0; i < XTrain.length; i++) {
      const pick = Math.floor(rng() * XTrain.length);
      sampleX.push(XTrain[pick]);
      sampleY.push(yTrain[pick]);
    }
    const allFeats = featureNames.map((_, idx) => idx);
    // Pick 6 of 9 features per tree
    const shuffled = [...allFeats].sort(() => rng() - 0.5).slice(0, 6);
    rfTrees.push(buildTree(sampleX, sampleY, shuffled, 7, 4));
  }
  const rfPreds = XTest.map(
    (row) => rfTrees.reduce((sum, tree) => sum + predictTree(tree, row), 0) / rfTrees.length
  );
  const rfMetrics = evaluateMetrics(yTest, rfPreds);

  // 2. Ridge Regression baseline
  const ridgeWeights = fitRidgeRegression(XTrain, yTrain, 1.5);
  const ridgePreds = XTest.map((row) =>
    ridgeWeights[0] + row.reduce((s, val, idx) => s + val * ridgeWeights[idx + 1], 0)
  );
  const ridgeMetrics = evaluateMetrics(yTest, ridgePreds);

  // 3. Gradient Boosted Trees (XGBoost-style residual boosting, 25 stages, lr=0.18)
  const baseMean = yTrain.reduce((a, b) => a + b, 0) / yTrain.length;
  const lr = 0.18;
  const boostTrees = [];
  let trainPreds = Array(yTrain.length).fill(baseMean);
  const allFeatIdx = featureNames.map((_, idx) => idx);
  for (let s = 0; s < 25; s++) {
    const residuals = yTrain.map((y, idx) => y - trainPreds[idx]);
    const tree = buildTree(XTrain, residuals, allFeatIdx, 4, 5);
    boostTrees.push(tree);
    trainPreds = trainPreds.map((p, idx) => p + lr * predictTree(tree, XTrain[idx]));
  }
  const boostPreds = XTest.map((row) => {
    let pred = baseMean;
    for (const tree of boostTrees) pred += lr * predictTree(tree, row);
    return pred;
  });
  const boostMetrics = evaluateMetrics(yTest, boostPreds);

  // Compute permutation feature importance on the Random Forest
  const baseRmse = rfMetrics.rmse;
  const importances = featureNames.map((fname, fIdx) => {
    const XPerm = XTest.map((row) => [...row]);
    const colVals = XPerm.map((r) => r[fIdx]).sort(() => rng() - 0.5);
    XPerm.forEach((r, idx) => {
      r[fIdx] = colVals[idx];
    });
    const permPreds = XPerm.map(
      (row) => rfTrees.reduce((sum, tree) => sum + predictTree(tree, row), 0) / rfTrees.length
    );
    const permRmse = evaluateMetrics(yTest, permPreds).rmse;
    return {
      feature: fname,
      deltaRmse: Math.max(0, Number((permRmse - baseRmse).toFixed(4)))
    };
  });
  const totalImp = importances.reduce((s, item) => s + item.deltaRmse, 0) || 1;
  const featureImportance = importances
    .map((item) => ({
      feature: item.feature,
      importance: Number(((item.deltaRmse / totalImp) * 100).toFixed(1))
    }))
    .sort((a, b) => b.importance - a.importance);

  // Choose primary model based on test RMSE
  const modelComparison = [
    { name: 'Random Forest Regressor', ...rfMetrics },
    { name: 'Gradient Boosted Regressor', ...boostMetrics },
    { name: 'Ridge Linear Regression', ...ridgeMetrics }
  ].sort((a, b) => a.rmse - b.rmse);

  const priceArtifact = {
    trainedAt: new Date().toISOString(),
    dataset: 'indian_cars_dataset.csv',
    datasetNotice: 'Trained on sample Indian automotive development dataset (360 records). Not live dealership feeds.',
    trainSize: XTrain.length,
    testSize: XTest.length,
    selectedModel: modelComparison[0].name,
    modelComparison,
    featureNames,
    featureImportance,
    encoders: {
      brands,
      models,
      fuels,
      transmissions,
      cities,
      cityRtoIndex,
      modelBaseMap
    },
    randomForest: {
      numTrees,
      trees: rfTrees
    },
    gradientBoosting: {
      baseMean: Number(baseMean.toFixed(4)),
      learningRate: lr,
      trees: boostTrees
    },
    ridgeWeights: ridgeWeights.map((w) => Number(w.toFixed(6)))
  };

  fs.writeFileSync(path.join(artifactsDir, 'price_model.json'), JSON.stringify(priceArtifact));

  // Train Demand Forecasting Model (City x Model seasonal linear regression)
  const demandGroups = {};
  for (const row of demandRecords) {
    const key = `${row.city}__${row.model}`;
    if (!demandGroups[key]) demandGroups[key] = [];
    demandGroups[key].push(row);
  }

  const seriesModels = {};
  const holdoutActuals = [];
  const holdoutPreds = [];

  for (const [key, rows] of Object.entries(demandGroups)) {
    rows.sort((a, b) => a.month_index - b.month_index);
    const split = rows.length - 3; // hold out last 3 months
    const trainRows = rows.slice(0, split);
    const testRows = rows.slice(split);

    // OLS slope & intercept on buyer_requests vs month_index + seasonal factor
    const n = trainRows.length;
    const meanX = trainRows.reduce((s, r) => s + r.month_index, 0) / n;
    const meanY = trainRows.reduce((s, r) => s + r.buyer_requests, 0) / n;
    let num = 0;
    let den = 0;
    for (const r of trainRows) {
      num += (r.month_index - meanX) * (r.buyer_requests - meanY);
      den += (r.month_index - meanX) * (r.month_index - meanX);
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = meanY - slope * meanX;

    // Seasonal multipliers by calendar month
    const monthRatios = {};
    for (const r of trainRows) {
      const mNum = Number(String(r.month).split('-')[1]);
      const basePred = Math.max(1, intercept + slope * r.month_index);
      if (!monthRatios[mNum]) monthRatios[mNum] = [];
      monthRatios[mNum].push(r.buyer_requests / basePred);
    }
    const seasonalFactors = {};
    for (let m = 1; m <= 12; m++) {
      const arr = monthRatios[m];
      seasonalFactors[m] = arr ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(3)) : 1.0;
    }

    for (const tr of testRows) {
      const mNum = Number(String(tr.month).split('-')[1]);
      const pred = Math.max(1, (intercept + slope * tr.month_index) * (seasonalFactors[mNum] || 1.0));
      holdoutActuals.push(tr.buyer_requests);
      holdoutPreds.push(pred);
    }

    // Refit on all 18 months for forward forecasts
    const nAll = rows.length;
    const mXAll = rows.reduce((s, r) => s + r.month_index, 0) / nAll;
    const mYAll = rows.reduce((s, r) => s + r.buyer_requests, 0) / nAll;
    let numAll = 0;
    let denAll = 0;
    for (const r of rows) {
      numAll += (r.month_index - mXAll) * (r.buyer_requests - mYAll);
      denAll += (r.month_index - mXAll) * (r.month_index - mXAll);
    }
    const fullSlope = denAll === 0 ? 0 : numAll / denAll;
    const fullIntercept = mYAll - fullSlope * mXAll;

    seriesModels[key] = {
      city: rows[0].city,
      brand: rows[0].brand,
      model: rows[0].model,
      intercept: Number(fullIntercept.toFixed(4)),
      slope: Number(fullSlope.toFixed(4)),
      seasonalFactors,
      lastMonthIndex: rows[rows.length - 1].month_index,
      lastMonthLabel: rows[rows.length - 1].month,
      avgUnitsPerRequest: Number(
        (rows.reduce((s, r) => s + r.units_sold / Math.max(1, r.buyer_requests), 0) / rows.length).toFixed(3)
      ),
      history: rows.map((r) => ({
        month: r.month,
        monthIndex: r.month_index,
        buyerRequests: r.buyer_requests,
        groupsFormed: r.groups_formed,
        unitsSold: r.units_sold,
        avgDiscountPct: r.avg_discount_pct
      }))
    };
  }

  const demandMetrics = evaluateMetrics(holdoutActuals, holdoutPreds);

  const demandArtifact = {
    trainedAt: new Date().toISOString(),
    dataset: 'historical_demand.csv',
    datasetNotice:
      'Forecasts are computed via Seasonal Trend Linear Regression on synthetic historical demand data (18 months).',
    totalRecords: demandRecords.length,
    evaluationMetrics: demandMetrics,
    seriesModels
  };

  fs.writeFileSync(path.join(artifactsDir, 'demand_model.json'), JSON.stringify(demandArtifact));

  return {
    priceModel: {
      selectedModel: priceArtifact.selectedModel,
      modelComparison: priceArtifact.modelComparison,
      trainSize: priceArtifact.trainSize,
      testSize: priceArtifact.testSize
    },
    demandModel: {
      totalRecords: demandArtifact.totalRecords,
      evaluationMetrics: demandArtifact.evaluationMetrics
    }
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = trainAllModels();
  console.log('Trained AutoCollective ML models:', JSON.stringify(result, null, 2));
}
