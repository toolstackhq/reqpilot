import { useMemo, useState } from 'react';
import styles from './ResponseViewer.module.css';

export function TestResults({ tests = [] }) {
  const [filter, setFilter] = useState('all');

  if (!tests.length) {
    return <p className={styles.empty}>Add scripts to validate responses and see test results here</p>;
  }

  const passed = tests.filter((test) => test.pass).length;
  const failed = tests.length - passed;
  const ratio = tests.length ? Math.round((passed / tests.length) * 100) : 0;

  const visibleTests = useMemo(() => {
    if (filter === 'passed') return tests.filter((test) => test.pass);
    if (filter === 'failed') return tests.filter((test) => !test.pass);
    return tests;
  }, [tests, filter]);

  return (
    <div className={styles.tests}>
      <div className={styles.testsHeader}>
        <div className={styles.testsStatGrid}>
          <article className={styles.testsStatCard}>
            <span className={styles.testsStatLabel}>Total</span>
            <strong className={styles.testsStatValue}>{tests.length}</strong>
          </article>
          <article className={`${styles.testsStatCard} ${styles.testsStatPass}`}>
            <span className={styles.testsStatLabel}>Passed</span>
            <strong className={styles.testsStatValue}>{passed}</strong>
          </article>
          <article className={`${styles.testsStatCard} ${styles.testsStatFail}`}>
            <span className={styles.testsStatLabel}>Failed</span>
            <strong className={styles.testsStatValue}>{failed}</strong>
          </article>
          <article className={styles.testsStatCard}>
            <span className={styles.testsStatLabel}>Pass Rate</span>
            <strong className={styles.testsStatValue}>{ratio}%</strong>
          </article>
        </div>

        <div className={styles.testsFilters} role="tablist" aria-label="Test result filters">
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'all'}
            className={filter === 'all' ? styles.testsFilterActive : styles.testsFilter}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'passed'}
            className={filter === 'passed' ? styles.testsFilterActive : styles.testsFilter}
            onClick={() => setFilter('passed')}
          >
            Passed
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filter === 'failed'}
            className={filter === 'failed' ? styles.testsFilterActive : styles.testsFilter}
            onClick={() => setFilter('failed')}
          >
            Failed
          </button>
        </div>
      </div>

      {visibleTests.length ? (
        <ul className={styles.testList} role="list">
          {visibleTests.map((test, index) => (
            <li
              key={`${test.name}-${index}`}
              role="listitem"
              className={test.pass ? styles.testItemPass : styles.testItemFail}
            >
              <div className={styles.testItemMain}>
                <span className={test.pass ? styles.testIconPass : styles.testIconFail} aria-hidden="true">
                  {test.pass ? '✓' : '✕'}
                </span>
                <div className={styles.testBody}>
                  <p className={styles.testName}>{test.name}</p>
                  {!test.pass && test.error ? <pre className={styles.failReason}>{test.error}</pre> : null}
                </div>
              </div>
              <strong className={test.pass ? styles.testBadgePass : styles.testBadgeFail}>{test.pass ? 'PASS' : 'FAIL'}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No tests in this filter</p>
      )}
    </div>
  );
}
