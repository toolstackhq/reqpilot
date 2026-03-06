import styles from './ResponseViewer.module.css';

export function TestResults({ tests = [] }) {
  if (!tests.length) {
    return <p className={styles.empty}>Add tests in the Tests tab to validate responses</p>;
  }

  const passed = tests.filter((test) => test.pass).length;
  const failed = tests.length - passed;
  const ratio = tests.length ? Math.round((passed / tests.length) * 100) : 0;

  return (
    <div className={styles.tests}>
      <div className={styles.summary}>
        <p>
          {tests.length} tests - {passed} passed, {failed} failed
        </p>
        <div className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={ratio}>
          <div className={styles.progressFill} style={{ width: `${ratio}%` }} />
        </div>
      </div>

      <ul className={styles.testList} role="list">
        {tests.map((test, index) => (
          <li key={`${test.name}-${index}`} role="listitem" className={styles.testItem}>
            <span>{test.pass ? '✔' : '✖'}</span>
            <span>{test.name}</span>
            <strong>{test.pass ? 'PASS' : 'FAIL'}</strong>
            {!test.pass && test.error ? <span className={styles.failReason}>{test.error}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
