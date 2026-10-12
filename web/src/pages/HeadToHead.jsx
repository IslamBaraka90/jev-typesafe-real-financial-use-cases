import { Link } from '../lib/router.jsx';
import { MODEL_BY_ID } from '../../../demos/lib/models.js';

// Every decision model against every other. The leaderboard counts only the items every model in the
// group answered, so refusing or failing hard items earns nothing; the matrix below it shows each
// demo on its own, with the best score in the row marked.

const percent = (value, digits = 1) => (Number.isFinite(value) ? `${(value * 100).toFixed(value === 1 || value === 0 ? 0 : digits)}%` : '–');
const ms = (value) => (Number.isFinite(value) ? (value >= 10_000 ? `${(value / 1000).toFixed(0)} s` : value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${Math.round(value)} ms`) : '–');
const money = (value) => (Number.isFinite(value) ? (value < 0.01 ? `$${value.toFixed(4)}` : `$${value.toFixed(3)}`) : '–');

function Leaderboard({ board }) {
  const fastest = Math.min(...board.models.map((model) => model.speed?.p50 ?? Infinity));
  return (
    <section className="panel stack h2h-board" aria-label={`${board.label} leaderboard`}>
      <header className="bench-group-head">
        <h2>{board.label}</h2>
        <span className="meta">
          {board.models.length} models on the same {board.commonItems.toLocaleString('en-US')} graded items across {board.demos} demos
        </span>
      </header>
      <div className="table-scroll">
        <table className="data-table bench-table h2h-table">
          <thead>
            <tr>
              <th scope="col" className="num">#</th>
              <th scope="col">Model</th>
              <th scope="col">Matches ground truth</th>
              <th scope="col" className="num">Demos won</th>
              <th scope="col" className="num">Median latency</th>
              <th scope="col" className="num">95th percentile</th>
              <th scope="col" className="num">Cost per 1,000 items</th>
              <th scope="col" className="num">Answered</th>
            </tr>
          </thead>
          <tbody>
            {board.models.map((model, index) => (
              <tr key={model.id}>
                <td className="num">{index + 1}</td>
                <th scope="row">
                  <span className="h2h-model">
                    <strong>{model.label}</strong>
                    <span className="meta">{model.maker}</span>
                  </span>
                </th>
                <td>
                  <span className="bench-agreement">
                    <span className="bench-track" role="img" aria-label={`${model.right} of ${model.graded} match ground truth`}>
                      <i className="bench-interval" style={{ left: `${model.interval.low * 100}%`, width: `${(model.interval.high - model.interval.low) * 100}%` }} />
                      <i className="bench-fill" style={{ width: `${(model.accuracy ?? 0) * 100}%` }} />
                    </span>
                    <span className="num">
                      <strong>{percent(model.accuracy)}</strong> <span className="meta">{model.right.toLocaleString('en-US')} of {model.graded.toLocaleString('en-US')}</span>
                    </span>
                  </span>
                </td>
                <td className="num">{model.wins}</td>
                <td className="num">
                  {ms(model.speed?.p50)}
                  {model.speed?.p50 === fastest && <span className="h2h-tag">fastest</span>}
                  {model.speed?.sampled && <span className="meta" title={`Timed on a sample of ${model.speed.n} requests; its recording predates per-item timing.`}> *</span>}
                </td>
                <td className="num">{ms(model.speed?.p95)}</td>
                <td className="num">{money(model.costPer1k)}</td>
                <td className="num">
                  {percent(model.coverage)}
                  {model.refused > 0 && <span className="meta"> · {model.refused} refused</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {board.excluded.length > 0 && (
        <p className="meta">
          Not in this table:{' '}
          {board.excluded
            .filter((model) => model.reason !== 'Does not take images.')
            .map((model) => `${model.label} (${model.reason.replace(/\.$/, '').toLowerCase()})`)
            .join('; ') || 'the models that do not take images'}
          .
        </p>
      )}
    </section>
  );
}

/** Demo rows by model columns, each cell the share of that demo's graded items the model got right. */
function Matrix({ rows, models }) {
  return (
    <section className="panel stack" aria-label="Every demo on every model">
      <header className="bench-group-head">
        <h2>Every demo, every model</h2>
        <span className="meta">Share of each demo’s graded items that matched ground truth. The best in each row is outlined; a dash means the model did not run that demo.</span>
      </header>
      <div className="table-scroll">
        <table className="data-table h2h-matrix">
          <thead>
            <tr>
              <th scope="col">Demo</th>
              {models.map((id) => (
                <th key={id} scope="col" className="num h2h-col">
                  <span>{MODEL_BY_ID[id].label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const shares = models.map((id) => (row.models?.[id]?.graded ? row.models[id].right / row.models[id].graded : null));
              const best = Math.max(...shares.filter(Number.isFinite));
              return (
                <tr key={row.id}>
                  <th scope="row">
                    <Link to={`/demos/${row.id}`}>{row.title}</Link>
                  </th>
                  {shares.map((share, index) => (
                    <td
                      key={models[index]}
                      className={`num h2h-cell${share === best ? ' best' : ''}`}
                      style={Number.isFinite(share) ? { '--heat': share.toFixed(3) } : undefined}
                      title={Number.isFinite(share) ? `${MODEL_BY_ID[models[index]].label}: ${row.models[models[index]].right} of ${row.models[models[index]].graded}` : 'Not run'}
                    >
                      {Number.isFinite(share) ? Math.round(share * 100) : '–'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function HeadToHead({ summary, rows }) {
  const boards = summary.leaderboards ?? [];
  if (!boards.length) return null;
  const models = [...new Set(rows.flatMap((row) => Object.keys(row.models ?? {})))].filter((id) => MODEL_BY_ID[id]);
  const order = Object.keys(MODEL_BY_ID);
  models.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return (
    <>
      {boards.map((board) => (
        <Leaderboard key={board.label} board={board} />
      ))}
      <p className="meta">
        Latency is wall-clock time for one request from this machine, so it includes the network and, for the models reached through OpenRouter, its routing. Rows marked * were timed on a sample of
        three items per demo, because their recordings predate per-item timing. Costs are what OpenRouter reported per call; Jev’s and GPT-6 Luna’s recordings kept token counts only.
      </p>
      <Matrix rows={rows.filter((row) => row.graded)} models={models} />
    </>
  );
}
