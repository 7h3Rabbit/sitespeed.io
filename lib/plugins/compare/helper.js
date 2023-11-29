import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import path from 'node:path';

import { execa } from 'execa';
import { Stats } from 'fast-stats';
import intel from 'intel';
import { decimals } from '../../support/helpers/index.js';
const log = intel.getLogger('sitespeedio.plugin.compare');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class Metric {
  constructor(name, values) {
    this.name = name;
    this.stats = new Stats().push(values);
  }

  getName() {
    return this.name;
  }
  getValues() {
    return this.stats.data;
  }
  getStats() {
    return this.stats;
  }
}

export async function runStatisticalTests(data) {
  let extras = '';
  try {
    const { stdout } = await execa(
      process.env.PYTHON || 'python',
      [join(__dirname, 'statistical.py')],
      {
        input: JSON.stringify(data)
      }
    );
    extras = stdout;
    const results = JSON.parse(stdout);
    log.verbose('Result from the python script %j'.results);
    return results;
  } catch (error) {
    log.error(error);
    log.error(extras);
  }
}

export function getStatistics(arrayOfValues) {
  return new Stats().push(arrayOfValues);
}

function getExtras(data) {
  const metrics = {};
  const results = {};

  for (const run of data.extras) {
    for (const name of Object.keys(run)) {
      if (!metrics[name]) {
        metrics[name] = [];
      }
      metrics[name].push(run[name]);
    }
  }

  for (const [metricName, values] of Object.entries(metrics)) {
    results[metricName] = new Metric(metricName, values);
  }

  return results;
}

function getTimings(data) {
  const timingMetrics = {
    ttfb: [],
    loadEventEnd: [],
    firstContentfulPaint: [],
    fullyLoaded: []
  };

  for (const run of data.browserScripts) {
    timingMetrics['ttfb'].push(run.timings.ttfb);
    timingMetrics['loadEventEnd'].push(run.timings.loadEventEnd);
    timingMetrics['firstContentfulPaint'].push(
      run.timings.paintTiming['first-contentful-paint']
    );
  }

  for (const run of data.fullyLoaded) {
    timingMetrics['fullyLoaded'].push(run);
  }

  const results = {};
  for (const [metricName, values] of Object.entries(timingMetrics)) {
    if (!results.timings) {
      results.timings = {};
    }
    results.timings[metricName] = new Metric(`${metricName}`, values);
  }
  return results;
}

function getUserTimings(data) {
  const userTimingMetrics = {};
  for (const run of data.browserScripts) {
    if (run.timings.userTimings) {
      const { marks, measures } = run.timings.userTimings;

      for (const mark of marks) {
        if (!userTimingMetrics[mark.name]) {
          userTimingMetrics[mark.name] = [];
        }
        userTimingMetrics[mark.name].push(decimals(mark.startTime));
      }

      for (const measure of measures) {
        if (!userTimingMetrics[measure.name]) {
          userTimingMetrics[measure.name] = [];
        }
        userTimingMetrics[measure.name].push(decimals(measure.startTime));
      }
    }
  }

  const results = {};
  for (const [metricName, values] of Object.entries(userTimingMetrics)) {
    if (!results.userTimings) {
      results.userTimings = {};
    }
    results.userTimings[metricName] = new Metric(`${metricName}`, values);
  }
  return results;
}

function getElementTimings(data) {
  const elementTimingMetrics = {};
  for (const run of data.browserScripts) {
    if (run.timings.elementTimings) {
      for (const [name, timing] of Object.entries(run.timings.elementTimings)) {
        if (!elementTimingMetrics[name]) {
          elementTimingMetrics[name] = [];
        }
        elementTimingMetrics[name].push(timing.renderTime);
      }
    }
  }

  const results = {};
  for (const [metricName, values] of Object.entries(elementTimingMetrics)) {
    if (!results.elementTimings) {
      results.elementTimings = {};
    }
    results.elementTimings[metricName] = new Metric(`${metricName}`, values);
  }
  return results;
}

function getGoogleWebVitals(data) {
  const googleWebVitalsMetrics = {};
  for (const run of data.googleWebVitals) {
    for (const [name, value] of Object.entries(run)) {
      if (!googleWebVitalsMetrics[name]) {
        googleWebVitalsMetrics[name] = [];
      }
      googleWebVitalsMetrics[name].push(decimals(value));
    }
  }

  const results = {};
  for (const [metricName, values] of Object.entries(googleWebVitalsMetrics)) {
    if (!results.googleWebVitals) {
      results.googleWebVitals = {};
    }
    results.googleWebVitals[metricName] = new Metric(`${metricName}`, values);
  }
  return results;
}

function getVisualMetrics(data) {
  const DO_NOT_USE = new Set([
    'VisualProgress',
    'videoRecordingStart',
    'VisualComplete85',
    'VisualComplete95',
    'VisualComplete99'
  ]);

  const visualMetrics = {};
  for (const run of data.visualMetrics) {
    for (const [name, value] of Object.entries(run)) {
      if (!DO_NOT_USE.has(name)) {
        if (!visualMetrics[name]) {
          visualMetrics[name] = [];
        }
        visualMetrics[name].push(value);
      }
    }
  }

  const results = {};
  for (const [metricName, values] of Object.entries(visualMetrics)) {
    if (!results.visualMetrics) {
      results.visualMetrics = {};
    }
    results.visualMetrics[metricName] = new Metric(`${metricName}`, values);
  }
  return results;
}

function getCDPPerformance(data) {
  const metricsToKeep = new Set([
    'JSEventListeners',
    'LayoutCount',
    'RecalcStyleCount',
    'LayoutDuration',
    'RecalcStyleDuration',
    'ScriptDuration',
    'V8CompileDuration',
    'TaskDuration',
    'TaskOtherDuration',
    'JSHeapUsedSize'
  ]);
  const cdpPerformance = {};
  for (const run of data.cdp.performance) {
    for (const name of Object.keys(run)) {
      if (metricsToKeep.has(name)) {
        if (!cdpPerformance[name]) {
          cdpPerformance[name] = [];
        }
        cdpPerformance[name].push(decimals(run[name]));
      }
    }
  }

  // Convert to Metric objects
  const results = {};
  for (const [metricName, values] of Object.entries(cdpPerformance)) {
    if (!results.cdp) {
      results.cdp = {};
    }
    results.cdp[metricName] = new Metric(`${metricName}`, values);
  }
  return results;
}

function getCPU(data) {
  const cpuMetrics = {
    tasks: [],
    totalDuration: [],
    lastLongTask: [],
    beforeFirstContentfulPaint: [],
    beforeLargestContentfulPaint: []
  };

  for (const run of data.cpu) {
    const longTasks = run.longTasks;
    cpuMetrics['tasks'].push(longTasks['tasks']);
    cpuMetrics['totalDuration'].push(longTasks['totalDuration']);
    cpuMetrics['lastLongTask'].push(longTasks['lastLongTask']);
    cpuMetrics['beforeFirstContentfulPaint'].push(
      longTasks['beforeFirstContentfulPaint'].totalDuration
    );
    cpuMetrics['beforeLargestContentfulPaint'].push(
      longTasks['beforeLargestContentfulPaint'].totalDuration
    );
  }

  const isEmpty = Object.values(cpuMetrics).every(arr => arr.length === 0);
  if (isEmpty) {
    return {}; // Return an empty object if no data
  }

  const results = {};
  for (const [metricName, values] of Object.entries(cpuMetrics)) {
    if (!results.cpu) {
      results.cpu = {};
    }
    results.cpu[metricName] = new Metric(`${metricName}`, values);
  }
  return results;
}

function getRenderBlocking(data) {
  const renderBlockingMetrics = {
    beforeFCPms: [],
    beforeLCPms: [],
    beforeFCPelements: [],
    beforeLCPelements: []
  };

  for (const run of data.renderBlocking) {
    renderBlockingMetrics['beforeFCPms'].push(
      run.recalculateStyle.beforeFCP.durationInMillis
    );
    renderBlockingMetrics['beforeFCPelements'].push(
      run.recalculateStyle.beforeFCP.elements
    );
    renderBlockingMetrics['beforeLCPms'].push(
      run.recalculateStyle.beforeLCP.durationInMillis
    );
    renderBlockingMetrics['beforeLCPelements'].push(
      run.recalculateStyle.beforeLCP.elements
    );
  }

  // Check if all arrays in renderBlockingMetrics are empty
  const isEmpty = Object.values(renderBlockingMetrics).every(
    arr => arr.length === 0
  );
  if (isEmpty) {
    return {}; // Return an empty object if no data
  }

  const results = {};
  for (const [metricName, values] of Object.entries(renderBlockingMetrics)) {
    if (!results.renderBlocking) {
      results.renderBlocking = {};
    }
    results.renderBlocking[metricName] = new Metric(`${metricName}`, values);
  }

  return results;
}

export function getMetrics(data) {
  const userTimings = getUserTimings(data);
  const elementTimings = getElementTimings(data);
  const visualMetrics = getVisualMetrics(data);
  const rb = getRenderBlocking(data);
  const gWV = getGoogleWebVitals(data);
  const cdp = getCDPPerformance(data);
  const cpu = getCPU(data);
  const timings = getTimings(data);
  const extras = getExtras(data);
  return {
    ...extras,
    ...timings,
    ...cpu,
    ...cdp,
    ...visualMetrics,
    ...gWV,
    ...rb,
    ...elementTimings,
    ...userTimings
  };
}