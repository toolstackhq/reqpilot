import styles from './ResponseViewer.module.css';

export function ResponseHeaders({ headers = {} }) {
  const entries = Object.entries(headers);

  if (!entries.length) {
    return <p className={styles.empty}>No response headers.</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th scope="col">Header</th>
          <th scope="col">Value</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([key, value]) => (
          <tr key={key}>
            <td>{key}</td>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
