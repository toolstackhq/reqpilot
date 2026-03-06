import styles from './EnvSelector.module.css';

export function EnvSelector({ environments, activeId, onChange, onManage }) {
  return (
    <div className={styles.wrap}>
      <label className="sr-only" htmlFor="env-selector">
        Active environment
      </label>
      <select id="env-selector" className={styles.select} value={activeId} onChange={(event) => onChange(event.target.value)}>
        {environments.map((environment) => (
          <option key={environment.id} value={environment.id}>
            {environment.name}
          </option>
        ))}
      </select>
      <button className={styles.button} type="button" onClick={onManage}>
        Manage
      </button>
    </div>
  );
}
