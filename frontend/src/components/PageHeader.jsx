export function PageHeader({ title, description, actions, testid }) {
  return (
    <div
      data-testid={testid || "page-header"}
      className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8"
    >
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-slate-500 max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
