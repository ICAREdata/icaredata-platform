CREATE TABLE trial_data (
	ID SERIAL PRIMARY KEY,
	site_id VARCHAR NOT NULL,
	trial_id VARCHAR NOT NULL,
	mrn VARCHAR NOT NULL,
	capture_time TIMESTAMP NOT NULL,
	submission_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
	bundle_id VARCHAR NOT NULL,
	bundle JSONB NOT NULL,
	UNIQUE (site_id, trial_id, bundle_id)
);