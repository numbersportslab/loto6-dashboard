"use strict";

const byId = (id) => document.getElementById(id);
const periods = new Map([["all", Infinity], ["30", 30], ["100", 100], ["500", 500]]);
const countFormat = new Intl.NumberFormat("ja-JP");
const rateFormat = new Intl.NumberFormat("ja-JP", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const numberLabel = (number) => String(number).padStart(2, "0");

function aggregate(draws) {
  const frequency = Array(43).fill(0);
  const parity = Array(7).fill(0);
  const size = Array(7).fill(0);
  const sums = new Map();
  for (const { main } of draws) {
    let odd = 0;
    let small = 0;
    let sum = 0;
    for (const number of main) {
      frequency[number - 1] += 1;
      odd += number % 2;
      small += Number(number <= 21);
      sum += number;
    }
    parity[odd] += 1;
    size[small] += 1;
    sums.set(sum, (sums.get(sum) ?? 0) + 1);
  }
  return { frequency, parity, size, sums };
}

function sortFrequency(frequency, order) {
  const entries = frequency.map((count, index) => ({ number: index + 1, count }));
  if (order === "desc") entries.sort((a, b) => b.count - a.count || a.number - b.number);
  if (order === "asc") entries.sort((a, b) => a.count - b.count || a.number - b.number);
  return entries;
}

function rankSums(sums) {
  return [...sums].sort(([aSum, aCount], [bSum, bCount]) => bCount - aCount || aSum - bSum).slice(0, 10);
}

function span(className, value = "") {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = value;
  return element;
}

function barRow(label, count, scale, percentage) {
  const row = document.createElement("li");
  row.className = "bar-row";
  const track = span("track");
  track.setAttribute("aria-hidden", "true");
  const bar = span("bar");
  bar.style.width = `${count / scale * 100}%`;
  track.append(bar);
  row.append(span("bar-label", label), track, span("bar-value", countFormat.format(count)));
  if (percentage !== undefined) row.append(span("rate", percentage));
  return row;
}

function renderFrequency(frequency, order) {
  const scale = Math.max(1, ...frequency);
  const rows = sortFrequency(frequency, order)
    .map(({ number, count }) => barRow(numberLabel(number), count, scale));
  byId("frequency").replaceChildren(...rows);
}

function renderRatios(id, counts, total) {
  const rows = counts.map((count, index) => barRow(
    `${index}:${6 - index}`, count, total, rateFormat.format(count / total),
  ));
  byId(id).replaceChildren(...rows);
}

function renderSums(sums, total) {
  const rows = rankSums(sums).map(([sum, count], index) => {
    const row = document.createElement("tr");
    for (const value of [index + 1, sum, countFormat.format(count), rateFormat.format(count / total)]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    return row;
  });
  byId("sums").replaceChildren(...rows);
}

function showDate(id, value) {
  const time = byId(id);
  time.dateTime = value;
  time.textContent = value;
}

function init(data) {
  if (!data?.draws?.length || !data.updatedOn) {
    const error = byId("error");
    error.textContent = "抽選履歴を読み込めませんでした。loto6-data.js が同じフォルダにあるか確認してください。";
    error.hidden = false;
    return;
  }

  const period = byId("period");
  const sort = byId("sort");
  let frequency;
  function renderPeriod() {
    const limit = periods.get(period.value) ?? Infinity;
    const draws = data.draws.slice(-limit);
    const first = draws[0];
    const last = draws.at(-1);
    const total = draws.length;
    const summary = aggregate(draws);
    frequency = summary.frequency;
    byId("draw-count").textContent = `${countFormat.format(total)}回`;
    byId("draw-range").textContent = `第${first.draw}回〜第${last.draw}回`;
    showDate("last-date", last.date);
    renderFrequency(frequency, sort.value);
    renderRatios("parity", summary.parity, total);
    renderRatios("size", summary.size, total);
    renderSums(summary.sums, total);
  }
  showDate("updated-on", data.updatedOn);
  period.addEventListener("change", renderPeriod);
  sort.addEventListener("change", () => renderFrequency(frequency, sort.value));
  renderPeriod();
  byId("dashboard").hidden = false;
}

init(window.LOTO6_DASHBOARD_DATA);
