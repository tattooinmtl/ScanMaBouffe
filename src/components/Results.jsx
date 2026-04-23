const STATUS_CONFIG = {
  toxic: { label: 'Toxic / Harmful', color: 'red' },
  concerning: { label: 'Concerning', color: 'yellow' },
  safe: { label: 'Safe', color: 'green' },
  unknown: { label: 'Unknown', color: 'gray' },
};

function IngredientGroup({ status, items }) {
  if (!items.length) return null;
  const cfg = STATUS_CONFIG[status];
  return (
    <div className={`ingredient-group ${cfg.color}`}>
      <h3>{cfg.label} <span className="count">({items.length})</span></h3>
      {items.map((ing, i) => (
        <div key={i} className="ingredient">
          <span className="ingredient-name">{ing.name}</span>
          {ing.reason && <span className="ingredient-reason">{ing.reason}</span>}
        </div>
      ))}
    </div>
  );
}

export default function Results({ data, onReset }) {
  if (!data) return null;

  const byStatus = { toxic: [], concerning: [], safe: [], unknown: [] };
  for (const ing of data.ingredients || []) {
    const key = ing.status in byStatus ? ing.status : 'unknown';
    byStatus[key].push(ing);
  }

  const hasToxic = byStatus.toxic.length > 0;
  const hasConcerning = byStatus.concerning.length > 0;

  return (
    <div className="results">
      <div className="results-header">
        <h2>{data.product_name || 'Unknown Product'}</h2>
        {data.summary && <p className="summary">{data.summary}</p>}
      </div>

      {(data.toxic_count > 0 || data.concerning_count > 0) && (
        <div className={`alert-banner ${hasToxic ? 'red' : 'yellow'}`}>
          {hasToxic
            ? `⚠ ${data.toxic_count} toxic ingredient${data.toxic_count > 1 ? 's' : ''} found`
            : `${data.concerning_count} concerning ingredient${data.concerning_count > 1 ? 's' : ''} found`}
        </div>
      )}

      {data.ingredients && data.ingredients.length > 0 ? (
        <div className="ingredient-list">
          <IngredientGroup status="toxic" items={byStatus.toxic} />
          <IngredientGroup status="concerning" items={byStatus.concerning} />
          <IngredientGroup status="safe" items={byStatus.safe} />
          <IngredientGroup status="unknown" items={byStatus.unknown} />
        </div>
      ) : (
        <p className="no-ingredients">{data.summary || 'No ingredients could be extracted.'}</p>
      )}

      <button className="reset-btn" onClick={onReset}>Scan Another</button>
    </div>
  );
}
