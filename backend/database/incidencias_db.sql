--
-- PostgreSQL database dump
--

-- Dumped from database version 16.15 (Debian 16.15-1.pgdg13+2)
-- Dumped by pg_dump version 17.0

-- Started on 2026-09-16 17:46:02

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA IF NOT EXISTS public;

ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- TOC entry 3527 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 216 (class 1259 OID 16534)
-- Name: areas; Type: TABLE; Schema: public; Owner: postgre
--

CREATE TABLE public.areas (
    id_area integer NOT NULL,
    descripcion character varying(250) NOT NULL,
    activo smallint DEFAULT 1 NOT NULL
);


ALTER TABLE public.areas OWNER TO postgre;

--
-- TOC entry 217 (class 1259 OID 16538)
-- Name: areas_id_area_seq; Type: SEQUENCE; Schema: public; Owner: postgre
--

CREATE SEQUENCE public.areas_id_area_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.areas_id_area_seq OWNER TO postgre;

--
-- TOC entry 3528 (class 0 OID 0)
-- Dependencies: 217
-- Name: areas_id_area_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgre
--

ALTER SEQUENCE public.areas_id_area_seq OWNED BY public.areas.id_area;


--
-- TOC entry 218 (class 1259 OID 16539)
-- Name: articulos; Type: TABLE; Schema: public; Owner: postgre
--

CREATE TABLE public.articulos (
    id_articulo integer NOT NULL,
    id_area integer NOT NULL,
    id_categoria integer NOT NULL,
    descripcion character varying(250) NOT NULL,
    activo smallint DEFAULT 1 NOT NULL
);


ALTER TABLE public.articulos OWNER TO postgre;

--
-- TOC entry 219 (class 1259 OID 16543)
-- Name: articulos_id_articulo_seq; Type: SEQUENCE; Schema: public; Owner: postgre
--

CREATE SEQUENCE public.articulos_id_articulo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.articulos_id_articulo_seq OWNER TO postgre;

--
-- TOC entry 3529 (class 0 OID 0)
-- Dependencies: 219
-- Name: articulos_id_articulo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgre
--

ALTER SEQUENCE public.articulos_id_articulo_seq OWNED BY public.articulos.id_articulo;


--
-- TOC entry 220 (class 1259 OID 16544)
-- Name: categorias; Type: TABLE; Schema: public; Owner: postgre
--

CREATE TABLE public.categorias (
    id_categoria integer NOT NULL,
    descripcion character varying(255) NOT NULL,
    activo smallint DEFAULT 1 NOT NULL
);


ALTER TABLE public.categorias OWNER TO postgre;

--
-- TOC entry 221 (class 1259 OID 16548)
-- Name: categorias_id_categoria_seq; Type: SEQUENCE; Schema: public; Owner: postgre
--

CREATE SEQUENCE public.categorias_id_categoria_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categorias_id_categoria_seq OWNER TO postgre;

--
-- TOC entry 3530 (class 0 OID 0)
-- Dependencies: 221
-- Name: categorias_id_categoria_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgre
--

ALTER SEQUENCE public.categorias_id_categoria_seq OWNED BY public.categorias.id_categoria;


--
-- TOC entry 222 (class 1259 OID 16549)
-- Name: estados; Type: TABLE; Schema: public; Owner: postgre
--

CREATE TABLE public.estados (
    id_estado integer NOT NULL,
    descripcion character varying(255) NOT NULL,
    activo smallint DEFAULT 1 NOT NULL
);


ALTER TABLE public.estados OWNER TO postgre;

--
-- TOC entry 223 (class 1259 OID 16553)
-- Name: estados_id_estado_seq; Type: SEQUENCE; Schema: public; Owner: postgre
--

CREATE SEQUENCE public.estados_id_estado_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.estados_id_estado_seq OWNER TO postgre;

--
-- TOC entry 3531 (class 0 OID 0)
-- Dependencies: 223
-- Name: estados_id_estado_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgre
--

ALTER SEQUENCE public.estados_id_estado_seq OWNED BY public.estados.id_estado;


--
-- TOC entry 224 (class 1259 OID 16554)
-- Name: incidencias; Type: TABLE; Schema: public; Owner: postgre
--

CREATE TABLE public.incidencias (
    id_incidencia integer NOT NULL,
    id_articulo integer NOT NULL,
    id_estado integer NOT NULL,
    creado_por integer NOT NULL,
    asignado_a integer NOT NULL,
    creado timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    prioridad integer DEFAULT 1 NOT NULL,
    descripcion_pedido character varying(250),
    descripcion_resolucion character varying(250)
);


ALTER TABLE public.incidencias OWNER TO postgre;

--
-- TOC entry 225 (class 1259 OID 16561)
-- Name: incidencias_estados; Type: TABLE; Schema: public; Owner: postgre
--

CREATE TABLE public.incidencias_estados (
    id_pedidos_estados integer NOT NULL,
    id_incidencia integer NOT NULL,
    id_estado integer NOT NULL,
    fecha_hora_estado time with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.incidencias_estados OWNER TO postgre;

--
-- TOC entry 226 (class 1259 OID 16565)
-- Name: incidencias_estados_id_pedidos_estados_seq; Type: SEQUENCE; Schema: public; Owner: postgre
--

CREATE SEQUENCE public.incidencias_estados_id_pedidos_estados_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.incidencias_estados_id_pedidos_estados_seq OWNER TO postgre;

--
-- TOC entry 3532 (class 0 OID 0)
-- Dependencies: 226
-- Name: incidencias_estados_id_pedidos_estados_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgre
--

ALTER SEQUENCE public.incidencias_estados_id_pedidos_estados_seq OWNED BY public.incidencias_estados.id_pedidos_estados;


--
-- TOC entry 227 (class 1259 OID 16566)
-- Name: incidencias_id_incidencia_seq; Type: SEQUENCE; Schema: public; Owner: postgre
--

CREATE SEQUENCE public.incidencias_id_incidencia_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.incidencias_id_incidencia_seq OWNER TO postgre;

--
-- TOC entry 3533 (class 0 OID 0)
-- Dependencies: 227
-- Name: incidencias_id_incidencia_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgre
--

ALTER SEQUENCE public.incidencias_id_incidencia_seq OWNED BY public.incidencias.id_incidencia;


--
-- TOC entry 228 (class 1259 OID 16567)
-- Name: usuarios; Type: TABLE; Schema: public; Owner: postgre
--

CREATE TABLE public.usuarios (
    id_usuario integer NOT NULL,
    id_area integer NOT NULL,
    nombres character varying(250) NOT NULL,
    apellidos character varying(250) NOT NULL,
    usuario character varying(255) NOT NULL,
    contrasenia character varying(255) NOT NULL,
    avatar character varying(255) NOT NULL,
    rol integer NOT NULL,
    activo smallint DEFAULT 1 NOT NULL
);


ALTER TABLE public.usuarios OWNER TO postgre;

--
-- TOC entry 229 (class 1259 OID 16573)
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: postgre
--

CREATE SEQUENCE public.usuarios_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_usuario_seq OWNER TO postgre;

--
-- TOC entry 3534 (class 0 OID 0)
-- Dependencies: 229
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgre
--

ALTER SEQUENCE public.usuarios_id_usuario_seq OWNED BY public.usuarios.id_usuario;


--
-- TOC entry 3334 (class 2604 OID 16574)
-- Name: areas id_area; Type: DEFAULT; Schema: public; Owner: postgre
--

ALTER TABLE ONLY public.areas ALTER COLUMN id_area SET DEFAULT nextval('public.areas_id_area_seq'::regclass);


--
-- TOC entry 3336 (class 2604 OID 16575)
-- Name: articulos id_articulo; Type: DEFAULT; Schema: public; Owner: postgre
--

ALTER TABLE ONLY public.articulos ALTER COLUMN id_articulo SET DEFAULT nextval('public.articulos_id_articulo_seq'::regclass);


--
-- TOC entry 3338 (class 2604 OID 16576)
-- Name: categorias id_categoria; Type: DEFAULT; Schema: public; Owner: postgre
--

ALTER TABLE ONLY public.categorias ALTER COLUMN id_categoria SET DEFAULT nextval('public.categorias_id_categoria_seq'::regclass);


--
-- TOC entry 3340 (class 2604 OID 16577)
-- Name: estados id_estado; Type: DEFAULT; Schema: public; Owner: postgre
--

ALTER TABLE ONLY public.estados ALTER COLUMN id_estado SET DEFAULT nextval('public.estados_id_estado_seq'::regclass);


--
-- TOC entry 3342 (class 2604 OID 16578)
-- Name: incidencias id_incidencia; Type: DEFAULT; Schema: public; Owner: postgre
--

ALTER TABLE ONLY public.incidencias ALTER COLUMN id_incidencia SET DEFAULT nextval('public.incidencias_id_incidencia_seq'::regclass);


--
-- TOC entry 3345 (class 2604 OID 16579)
-- Name: incidencias_estados id_pedidos_estados; Type: DEFAULT; Schema: public; Owner: postgre
--

ALTER TABLE ONLY public.incidencias_estados ALTER COLUMN id_pedidos_estados SET DEFAULT nextval('public.incidencias_estados_id_pedidos_estados_seq'::regclass);


--
-- TOC entry 3347 (class 2604 OID 16580)
-- Name: usuarios id_usuario; Type: DEFAULT; Schema: public; Owner: postgre
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id_usuario SET DEFAULT nextval('public.usuarios_id_usuario_seq'::regclass);


--
-- TOC entry 3508 (class 0 OID 16534)
-- Dependencies: 216
-- Data for Name: areas; Type: TABLE DATA; Schema: public; Owner: postgre
--

INSERT INTO public.areas VALUES (1, 'Legales', 1);
INSERT INTO public.areas VALUES (2, 'Personal', 1);
INSERT INTO public.areas VALUES (3, 'Sistemas', 1);
INSERT INTO public.areas VALUES (4, 'Hacienda', 1);
INSERT INTO public.areas VALUES (5, 'Finanzas', 1);
INSERT INTO public.areas VALUES (6, 'Salud y Accion Social', 1);
INSERT INTO public.areas VALUES (7, 'Desarrollo Urbano', 0);


--
-- TOC entry 3510 (class 0 OID 16539)
-- Dependencies: 218
-- Data for Name: articulos; Type: TABLE DATA; Schema: public; Owner: postgre
--

INSERT INTO public.articulos VALUES (1, 1, 1, 'Mouse sin pilas', 1);
INSERT INTO public.articulos VALUES (2, 1, 1, 'Monitor LG', 1);
INSERT INTO public.articulos VALUES (3, 1, 1, 'Notebook HP', 1);


--
-- TOC entry 3512 (class 0 OID 16544)
-- Dependencies: 220
-- Data for Name: categorias; Type: TABLE DATA; Schema: public; Owner: postgre
--

INSERT INTO public.categorias VALUES (1, 'Perifericos', 1);
INSERT INTO public.categorias VALUES (2, 'Notebooks', 1);
INSERT INTO public.categorias VALUES (3, 'PC Escritorio', 1);
INSERT INTO public.categorias VALUES (4, 'CPU', 1);
INSERT INTO public.categorias VALUES (5, 'Almacenamiento', 1);
INSERT INTO public.categorias VALUES (6, 'Equipos de Red', 1);
INSERT INTO public.categorias VALUES (7, 'nueva', 0);
INSERT INTO public.categorias VALUES (8, 'test', 0);
INSERT INTO public.categorias VALUES (9, 'otra', 0);
INSERT INTO public.categorias VALUES (10, 'daw', 1);
INSERT INTO public.categorias VALUES (11, 'daw', 1);
INSERT INTO public.categorias VALUES (12, 'daw', 1);
INSERT INTO public.categorias VALUES (13, 'daw', 1);
INSERT INTO public.categorias VALUES (14, 'ocho', 1);


--
-- TOC entry 3514 (class 0 OID 16549)
-- Dependencies: 222
-- Data for Name: estados; Type: TABLE DATA; Schema: public; Owner: postgre
--

INSERT INTO public.estados VALUES (1, 'Pendiente', 1);
INSERT INTO public.estados VALUES (2, 'En Proceso', 1);
INSERT INTO public.estados VALUES (3, 'Resuela', 1);
INSERT INTO public.estados VALUES (4, 'Cancelada', 1);


--
-- TOC entry 3516 (class 0 OID 16554)
-- Dependencies: 224
-- Data for Name: incidencias; Type: TABLE DATA; Schema: public; Owner: postgre
--

INSERT INTO public.incidencias VALUES (1, 1, 1, 4, 1, '2026-09-11 18:47:38.751684+00', 1, 'descripción pedido', '');
INSERT INTO public.incidencias VALUES (2, 1, 1, 4, 2, '2026-09-11 18:50:08.269506+00', 1, 'descripción pedido', '');
INSERT INTO public.incidencias VALUES (3, 2, 1, 4, 1, '2026-09-13 18:52:15.532034+00', 1, 'No enciende', '');
INSERT INTO public.incidencias VALUES (4, 3, 1, 4, 2, '2026-09-13 18:52:51.346357+00', 1, 'No carga la batería', '');


--
-- TOC entry 3517 (class 0 OID 16561)
-- Dependencies: 225
-- Data for Name: incidencias_estados; Type: TABLE DATA; Schema: public; Owner: postgre
--



--
-- TOC entry 3520 (class 0 OID 16567)
-- Dependencies: 228
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: postgre
--

INSERT INTO public.usuarios VALUES (1, 3, 'Carlos', 'Perez', 'carper@correo.com', 'fcaddfce9c7c894c376cf085b51ee37b851e89477a2986d2a26b8cc1f484eaf8', '', 2, 1);
INSERT INTO public.usuarios VALUES (2, 3, 'Carmen', 'Gomez', 'cargom@correo.com', 'be4288567c04f9b827ff17cad92f29fc8ab6667bf235e7ebba558588e2606ee2', '', 2, 1);
INSERT INTO public.usuarios VALUES (3, 3, 'Pamela', 'Almeida', 'pamalm@correo.com', 'be39221afb177a35f41e3dc590cc630ed8e58773dbb11a29d7a332b9e1eeaad1', '', 1, 1);
INSERT INTO public.usuarios VALUES (4, 1, 'Esteban', 'Reniero', 'estren@correo.com', '31c1a3f84de963879b6e6b88e08297fcdeb419133989acf5e91cf5b75db1923f', '', 3, 1);


--
-- TOC entry 3535 (class 0 OID 0)
-- Dependencies: 217
-- Name: areas_id_area_seq; Type: SEQUENCE SET; Schema: public; Owner: postgre
--

SELECT pg_catalog.setval('public.areas_id_area_seq', 7, true);


--
-- TOC entry 3536 (class 0 OID 0)
-- Dependencies: 219
-- Name: articulos_id_articulo_seq; Type: SEQUENCE SET; Schema: public; Owner: postgre
--

SELECT pg_catalog.setval('public.articulos_id_articulo_seq', 3, true);


--
-- TOC entry 3537 (class 0 OID 0)
-- Dependencies: 221
-- Name: categorias_id_categoria_seq; Type: SEQUENCE SET; Schema: public; Owner: postgre
--

SELECT pg_catalog.setval('public.categorias_id_categoria_seq', 14, true);


--
-- TOC entry 3538 (class 0 OID 0)
-- Dependencies: 223
-- Name: estados_id_estado_seq; Type: SEQUENCE SET; Schema: public; Owner: postgre
--

SELECT pg_catalog.setval('public.estados_id_estado_seq', 4, true);


--
-- TOC entry 3539 (class 0 OID 0)
-- Dependencies: 226
-- Name: incidencias_estados_id_pedidos_estados_seq; Type: SEQUENCE SET; Schema: public; Owner: postgre
--

SELECT pg_catalog.setval('public.incidencias_estados_id_pedidos_estados_seq', 1, false);


--
-- TOC entry 3540 (class 0 OID 0)
-- Dependencies: 227
-- Name: incidencias_id_incidencia_seq; Type: SEQUENCE SET; Schema: public; Owner: postgre
--

SELECT pg_catalog.setval('public.incidencias_id_incidencia_seq', 4, true);


--
-- TOC entry 3541 (class 0 OID 0)
-- Dependencies: 229
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: postgre
--

SELECT pg_catalog.setval('public.usuarios_id_usuario_seq', 4, true);


--
-- TOC entry 3350 (class 2606 OID 16582)
-- Name: areas areas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgre
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_pkey PRIMARY KEY (id_area);


--
-- TOC entry 3352 (class 2606 OID 16584)
-- Name: articulos articulos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgre
--

ALTER TABLE ONLY public.articulos
    ADD CONSTRAINT articulos_pkey PRIMARY KEY (id_articulo);


--
-- TOC entry 3354 (class 2606 OID 16586)
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgre
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id_categoria);


--
-- TOC entry 3356 (class 2606 OID 16588)
-- Name: estados estados_pkey; Type: CONSTRAINT; Schema: public; Owner: postgre
--

ALTER TABLE ONLY public.estados
    ADD CONSTRAINT estados_pkey PRIMARY KEY (id_estado);


--
-- TOC entry 3360 (class 2606 OID 16590)
-- Name: incidencias_estados incidencias_estados_pkey; Type: CONSTRAINT; Schema: public; Owner: postgre
--

ALTER TABLE ONLY public.incidencias_estados
    ADD CONSTRAINT incidencias_estados_pkey PRIMARY KEY (id_pedidos_estados);


--
-- TOC entry 3358 (class 2606 OID 16592)
-- Name: incidencias incidencias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgre
--

ALTER TABLE ONLY public.incidencias
    ADD CONSTRAINT incidencias_pkey PRIMARY KEY (id_incidencia);


--
-- TOC entry 3362 (class 2606 OID 16594)
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgre
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario);


--
-- TOC entry 3364 (class 2606 OID 16596)
-- Name: usuarios usuarios_usuario_key; Type: CONSTRAINT; Schema: public; Owner: postgre
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_usuario_key UNIQUE (usuario);


-- Completed on 2026-09-16 17:46:02

--
-- PostgreSQL database dump complete
--
