/** Status of a single file generation. */
export type FileStatus = 'created' | 'skipped' | 'overwritten';

/** Result for one generated file. */
export interface GeneratedFile {
  readonly path: string;
  readonly status: FileStatus;
  readonly content: string;
}

/** Options controlling init behaviour. */
export interface InitOptions {
  /** Overwrite existing files. */
  readonly force?: boolean;
  /** Do not write to disk; return planned results only. */
  readonly dryRun?: boolean;
}

/** Aggregate result of the init operation. */
export interface InitResult {
  readonly files: readonly GeneratedFile[];
}
