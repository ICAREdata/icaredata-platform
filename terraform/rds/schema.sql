--
-- PostgreSQL database dump
--

-- Dumped from database version 11.10
-- Dumped by pg_dump version 11.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: data; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE USER keycloak with password :keycloak_password;
CREATE SCHEMA keycloak;

CREATE USER lambda with password :lambda_password;
CREATE SCHEMA data;


ALTER SCHEMA data OWNER TO postgres;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: messages; Type: TABLE; Schema: data; Owner: postgres
--

CREATE TABLE data.messages (
    id integer NOT NULL,
    subject_id character varying NOT NULL,
    trial_id character varying NOT NULL,
    site_id character varying,
    submission_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    bundle_id character varying NOT NULL,
    bundle jsonb NOT NULL)
    ;


ALTER TABLE data.messages OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: data; Owner: postgres
--

CREATE SEQUENCE data.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE data.messages_id_seq OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: data; Owner: postgres
--

ALTER SEQUENCE data.messages_id_seq OWNED BY data.messages.id;


--
-- Name: messages id; Type: DEFAULT; Schema: data; Owner: postgres
--

ALTER TABLE ONLY data.messages ALTER COLUMN id SET DEFAULT nextval('data.messages_id_seq'::regclass);

--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: data; Owner: postgres
--

ALTER TABLE ONLY data.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: messages messages_site_id_trial_id_bundle_id_key; Type: CONSTRAINT; Schema: data; Owner: postgres
--

ALTER TABLE ONLY data.messages
    ADD CONSTRAINT messages_site_id_trial_id_bundle_id_key UNIQUE (site_id, trial_id, bundle_id);


--
-- Name: SCHEMA data; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA data TO lambda;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE ALL ON SCHEMA public FROM rdsadmin;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;
GRANT ALL on SCHEMA keycloak to keycloak;

--
-- Name: TABLE messages; Type: ACL; Schema: data; Owner: postgres
--

GRANT SELECT,INSERT ON TABLE data.messages TO lambda;


--
-- Name: SEQUENCE messages_id_seq; Type: ACL; Schema: data; Owner: postgres
GRANT ALL ON SEQUENCE data.messages_id_seq TO lambda;