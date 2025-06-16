-- MIT License
--
-- Copyright (c) 2025 Juan Carlos Moral - juanky@juancarlosmoral.es
--
-- Permission is hereby granted, free of charge, to any person obtaining a copy of this software 
-- and associated documentation files (the "Software"), to deal in the Software without restriction, 
-- including without limitation the rights to use, copy, modify, merge, publish, distribute, 
-- sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
-- furnished to do so, subject to the following conditions:
--
-- 1. The above copyright notice and this permission notice shall be included in all copies or 
-- substantial portions of the Software.
--
-- 2. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING 
-- BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
-- NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, 
-- DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
-- OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: recurrence; Type: DOMAIN; Schema: public; Owner: me
--

CREATE DOMAIN public.recurrence AS text
	CONSTRAINT recurrence_check CHECK ((VALUE = ANY (ARRAY['none'::text, 'daily'::text, 'weekly'::text, 'weekdays'::text, '2weeks'::text, 'monthly'::text])))
	CONSTRAINT recurrence_check2 CHECK ((VALUE = ANY (ARRAY['none'::text, 'daily'::text, 'weekly'::text, 'weekdays'::text, '2weeks'::text, 'monthly'::text])));


ALTER DOMAIN public.recurrence OWNER TO me;

--
-- Name: cabeceras_sepa(date); Type: FUNCTION; Schema: public; Owner: me
--

CREATE FUNCTION public.cabeceras_sepa(fecha_cobro date) RETURNS TABLE(acreedor character varying, num_lineas integer, cabecera_presentador text, cabecera_acreedor text)
    LANGUAGE plpgsql
    AS $$
DECLARE
	v_id_presentador varchar;
	v_nombre_presentador varchar;
	v_id_acreedor varchar;
	v_nombre_acreedor varchar;
	v_iban_acreedor varchar;
	v_ref_identificativa varchar;
	v_entidad_receptora varchar;
	v_oficina_receptora varchar;
	v_cabecera_presentador text :='cabecera presentador';
	v_cabecera_acreedor text := 'cabecera acreedor';
	v_num_lineas integer :=2; -- nº de líneas de las cabeceras

	-- cabecera presentador (registro #1)
	cp_1 varchar :='01'; --código de registro
	cp_2 varchar :='19143'; --versión del cuaderno
	cp_3 varchar :='001'; -- número de dato
	cp_4 varchar; --identificador del presentador
	cp_5 varchar; --nombre del presentador
	cp_6 varchar; -- fecha de creación del fichero
	cp_7 varchar; --identificación del fichero
	cp_8 varchar; --entidad receptora
	cp_9 varchar; -- oficina receptora
	cp_10 varchar; --libre

	-- cabecera acreedor (registro #2)
	ca_1 varchar :='02'; --código de registro
	ca_2 varchar :='19143'; --versión del cuaderno
	ca_3 varchar :='002'; -- número de dato
	ca_4 varchar; -- identificador del acreedor (AT-02)
	ca_5 varchar; -- fecha de cobro (AT-11)
	ca_6 varchar; -- nombre del acreedor (AT-03)
	ca_7 varchar; -- dirección acreedor  (D1) (AT-05)
	ca_8 varchar; -- dirección acreedor  (D2) (AT-05)
	ca_9 varchar; -- dirección acreedor  (D3) (AT-05)
	ca_10 varchar; -- país del acreedor (AT-05)
	ca_11 varchar; -- cuenta del acreedor (AT-04)
	ca_12 varchar; -- libre

BEGIN
	SELECT id_presentador,nombre_presentador,id_acreedor,nombre_acreedor,iban_acreedor,ref_identificativa,entidad_receptora,oficina_receptora 
		INTO v_id_presentador,v_nombre_presentador,v_id_acreedor,v_nombre_acreedor,v_iban_acreedor,v_ref_identificativa,v_entidad_receptora,v_oficina_receptora 
	FROM properties;

	SELECT rpad(v_id_presentador,35,' ') INTO cp_4;
	SELECT rpad(v_nombre_presentador,70,' ') INTO cp_5;
	SELECT to_char(now(),'YYYYMMDD') INTO cp_6;
	SELECT 'PRE' || cp_6 || substring(to_char(now(),'HH24MISSMSMSMSMS') for 11) || v_ref_identificativa INTO cp_7;
	SELECT v_entidad_receptora INTO cp_8;
	SELECT v_oficina_receptora INTO cp_9;
	SELECT rpad(' ',434,' ') INTO cp_10;
	v_cabecera_presentador := cp_1 || cp_2 || cp_3 || cp_4 || cp_5 || cp_6 || cp_7 || cp_8 || cp_9 || cp_10 || E'\r\n';
	
	SELECT rpad(v_id_acreedor,35,' ') INTO ca_4;
	SELECT to_char(fecha_cobro,'YYYYMMDD') INTO ca_5;
	SELECT rpad(v_nombre_acreedor,70,' ') INTO ca_6;
	SELECT rpad(' ',50,' ') INTO ca_7;
	SELECT rpad(' ',50,' ') INTO ca_8;
	SELECT rpad(' ',40,' ') INTO ca_9;
	SELECT rpad(' ',2,' ') INTO ca_10;
	SELECT rpad(v_iban_acreedor,34,' ') INTO ca_11;
	SELECT rpad(' ',301,' ') INTO ca_12;

	v_cabecera_acreedor := ca_1 || ca_2 || ca_3 || ca_4 || ca_5 || ca_6 || ca_7 || ca_8 || ca_9 || ca_10 || ca_11 || ca_12 || E'\r\n';
	RETURN QUERY SELECT v_id_acreedor, v_num_lineas,v_cabecera_presentador,v_cabecera_acreedor;
END;
$$;


ALTER FUNCTION public.cabeceras_sepa(fecha_cobro date) OWNER TO me;

--
-- Name: calcula_tramos(numeric, numeric, numeric, numeric, numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: me
--

CREATE FUNCTION public.calcula_tramos(m3 numeric, t1 numeric, t2 numeric, pvp_m3 numeric, f_a numeric, f_b numeric, f_c numeric) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE

	m3_a numeric := 0;
	m3_b numeric := 0;
	m3_c numeric := 0;
	pvp_a numeric := pvp_m3 * f_a;
	pvp_b numeric := pvp_m3 * f_b;
	pvp_c numeric := pvp_m3 * f_c;
	v_m3 numeric :=0;
	v_resultado numeric :=0;

BEGIN
	if m3 <= t1 then
		m3_a := m3;
	elsif m3 > t1 and m3 <= (t1 + t2) then
		m3_a := t1;
		m3_b := m3 - t1;
	else 
		m3_a := t1;
		m3_b := t2;
		m3_c := m3 - (t1 + t2);
	end if;
	
	v_resultado := (m3_a * pvp_a) + (m3_b * pvp_b) + (m3_c * pvp_c);
	
	--RAISE NOTICE 'm3: %',m3;
	--RAISE NOTICE 't1: % t2: %',t1,t2;
	--RAISE NOTICE 'f_a: %, f_b: %, f_c: %',f_a,f_b,f_c;
	--RAISE NOTICE '************************************';
	--RAISE NOTICE 'm3_a: % (% €)',m3_a, (m3_a * pvp_a);
	--RAISE NOTICE 'm3_b: % (% €)',m3_b, (m3_b * pvp_b);
	--RAISE NOTICE 'm3_c: % (% €)',m3_c, (m3_c * pvp_c);
	--RAISE NOTICE 'total con tramos: % €', v_resultado;
	--RAISE NOTICE 'total sin tramos: % €', pvp_m3 * m3;
	
	RETURN v_resultado;
END;
$$;


ALTER FUNCTION public.calcula_tramos(m3 numeric, t1 numeric, t2 numeric, pvp_m3 numeric, f_a numeric, f_b numeric, f_c numeric) OWNER TO me;

--
-- Name: detalla_remesa_agua(); Type: FUNCTION; Schema: public; Owner: me
--

CREATE FUNCTION public.detalla_remesa_agua() RETURNS TABLE(r_fecha date, r_id_parcela character varying, r_titular_cc character varying, r_bic character varying, r_iban character varying, r_l1 numeric, r_l2 numeric, r_m3 numeric, r_t1 numeric, r_t2 numeric, r_pm3 numeric, r_f_a numeric, r_f_b numeric, r_f_c numeric, r_m3_a numeric, r_m3_b numeric, r_m3_c numeric, r_p_m3_a numeric, r_p_m3_b numeric, r_p_m3_c numeric, r_total numeric, r_domiciliado numeric, r_resumen text, r_ult_modif timestamp with time zone, r_user_modif character varying, r_inactivo boolean, r_domicilia_bco boolean, r_estado character)
    LANGUAGE plpgsql
    AS $$
DECLARE
   remesa_cursor CURSOR FOR SELECT fecha,id_parcela,titular_cc,bic,iban,l1,l2,m3,t1,t2,pm3,f_a,f_b,f_c,domiciliado,ult_modif,user_modif,inactivo,domicilia_bco,estado 
      FROM remesa_agua;
   v_fecha date;
   v_id_parcela varchar;
   v_titular_cc varchar;
   v_bic varchar;
   v_iban varchar;
   v_l1 numeric;
   v_l2 numeric;
   v_m3 numeric;
   v_t1 numeric;
   v_t2 numeric;
   v_pm3 numeric;
   v_f_a numeric;
   v_f_b numeric;
   v_f_c numeric;
   v_domiciliado numeric;
   v_ult_modif timestamp with time zone;
   v_user_modif varchar;
   m3_a numeric;
   m3_b numeric;
   m3_c numeric;
   p_m3_a numeric;
   p_m3_b numeric;
   p_m3_c numeric;
   total numeric;
   resumen text;
   v_inactivo boolean;
   v_domicilia_bco boolean;
   v_estado char;

BEGIN
	OPEN remesa_cursor;
	LOOP
      FETCH NEXT FROM remesa_cursor 
         INTO v_fecha,v_id_parcela,v_titular_cc,v_bic,v_iban,v_l1,v_l2,v_m3,v_t1,v_t2,v_pm3,v_f_a,v_f_b,v_f_c,v_domiciliado,v_ult_modif,v_user_modif,v_inactivo,v_domicilia_bco,v_estado;
      EXIT WHEN NOT FOUND;
      --RAISE NOTICE 'ID parcela: %, m3: %', v_id_parcela, v_m3; 
      SELECT v_m3_a,v_m3_b,v_m3_c,v_p_m3_a,v_p_m3_b,v_p_m3_c,v_resultado,v_resumen 
         FROM detalla_tramos(v_id_parcela,v_l1,v_l2,v_m3,v_t1,v_t2,v_pm3,v_f_a,v_f_b,v_f_c) 
         INTO m3_a,m3_b,m3_c,p_m3_a,p_m3_b,p_m3_c,total,resumen;
      
      RETURN QUERY SELECT v_fecha,v_id_parcela,v_titular_cc,v_bic,v_iban,v_l1,v_l2,v_m3,v_t1,v_t2,v_pm3,v_f_a,v_f_b,v_f_c,m3_a,m3_b,m3_c,
                           p_m3_a,p_m3_b,p_m3_c,total,v_domiciliado,resumen,v_ult_modif,v_user_modif,v_inactivo,v_domicilia_bco,v_estado;

   END LOOP;
   CLOSE remesa_cursor;

	
END;
$$;


ALTER FUNCTION public.detalla_remesa_agua() OWNER TO me;

--
-- Name: detalla_remesa_agua_residente(); Type: FUNCTION; Schema: public; Owner: me
--

CREATE FUNCTION public.detalla_remesa_agua_residente() RETURNS TABLE(r_fecha date, r_id_parcela character varying, r_titular_cc character varying, r_bic character varying, r_iban character varying, r_l1 numeric, r_l2 numeric, r_m3 numeric, r_t1 numeric, r_t2 numeric, r_pm3 numeric, r_f_a numeric, r_f_b numeric, r_f_c numeric, r_m3_a numeric, r_m3_b numeric, r_m3_c numeric, r_p_m3_a numeric, r_p_m3_b numeric, r_p_m3_c numeric, r_total numeric, r_domiciliado numeric, r_resumen text, r_ult_modif timestamp with time zone, r_user_modif character varying, r_inactivo boolean, r_domicilia_bco boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
   remesa_cursor CURSOR FOR SELECT fecha,id_parcela,titular_cc,bic,iban,l1,l2,m3,t1,t2,pm3,f_a,f_b,f_c,domiciliado,ult_modif,user_modif,inactivo,domicilia_bco 
      FROM remesa_agua_residente;
   v_fecha date;
   v_id_parcela varchar;
   v_titular_cc varchar;
   v_bic varchar;
   v_iban varchar;
   v_l1 numeric;
   v_l2 numeric;
   v_m3 numeric;
   v_t1 numeric;
   v_t2 numeric;
   v_pm3 numeric;
   v_f_a numeric;
   v_f_b numeric;
   v_f_c numeric;
   v_domiciliado numeric;
   v_ult_modif timestamp with time zone;
   v_user_modif varchar;
   m3_a numeric;
   m3_b numeric;
   m3_c numeric;
   p_m3_a numeric;
   p_m3_b numeric;
   p_m3_c numeric;
   total numeric;
   resumen text;
   v_inactivo boolean;
   v_domicilia_bco boolean;

BEGIN
	OPEN remesa_cursor;
	LOOP
      FETCH NEXT FROM remesa_cursor 
         INTO v_fecha,v_id_parcela,v_titular_cc,v_bic,v_iban,v_l1,v_l2,v_m3,v_t1,v_t2,v_pm3,v_f_a,v_f_b,v_f_c,v_domiciliado,v_ult_modif,v_user_modif,v_inactivo,v_domicilia_bco;
      EXIT WHEN NOT FOUND;
      --RAISE NOTICE 'ID parcela: %, m3: %', v_id_parcela, v_m3; 
      SELECT v_m3_a,v_m3_b,v_m3_c,v_p_m3_a,v_p_m3_b,v_p_m3_c,v_resultado,v_resumen 
         FROM detalla_tramos(v_id_parcela,v_l1,v_l2,v_m3,v_t1,v_t2,v_pm3,v_f_a,v_f_b,v_f_c) 
         INTO m3_a,m3_b,m3_c,p_m3_a,p_m3_b,p_m3_c,total,resumen;
      
      RETURN QUERY SELECT v_fecha,v_id_parcela,v_titular_cc,v_bic,v_iban,v_l1,v_l2,v_m3,v_t1,v_t2,v_pm3,v_f_a,v_f_b,v_f_c,m3_a,m3_b,m3_c,
                           p_m3_a,p_m3_b,p_m3_c,total,v_domiciliado,resumen,v_ult_modif,v_user_modif,v_inactivo,v_domicilia_bco;

   END LOOP;
   CLOSE remesa_cursor;

	
END;
$$;


ALTER FUNCTION public.detalla_remesa_agua_residente() OWNER TO me;

--
-- Name: detalla_tramos(character varying, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: me
--

CREATE FUNCTION public.detalla_tramos(id_parcela character varying, l1 numeric, l2 numeric, m3 numeric, t1 numeric, t2 numeric, pvp_m3 numeric, f_a numeric, f_b numeric, f_c numeric) RETURNS TABLE(v_id_parcela character varying, v_m3 numeric, v_t1 numeric, v_t2 numeric, v_pvp_m3 numeric, v_f_a numeric, v_f_b numeric, v_f_c numeric, v_m3_a numeric, v_m3_b numeric, v_m3_c numeric, v_p_m3_a numeric, v_p_m3_b numeric, v_p_m3_c numeric, v_resultado numeric, v_resumen text)
    LANGUAGE plpgsql
    AS $$
DECLARE

	m3_a numeric := 0;
	m3_b numeric := 0;
	m3_c numeric := 0;
	p_m3_a numeric := 0;
	p_m3_b numeric := 0;
	p_m3_c numeric := 0;
	pvp_a numeric := pvp_m3 * f_a;
	pvp_b numeric := pvp_m3 * f_b;
	pvp_c numeric := pvp_m3 * f_c;
	resultado numeric :=0;
	resumen text;

BEGIN
	if m3 <= t1 then
		m3_a := m3;
	elsif m3 > t1 and m3 <= (t1 + t2) then
		m3_a := t1;
		m3_b := m3 - t1;
	else 
		m3_a := t1;
		m3_b := t2;
		m3_c := m3 - (t1 + t2);
	end if;
	
	p_m3_a:= m3_a * pvp_a;
	p_m3_b:= m3_b * pvp_b;
	p_m3_c:= m3_c * pvp_c;

	resultado := p_m3_a + p_m3_b + p_m3_c;

	resumen := format('AGUA L.ant.:%s L.act.:%s m3:%s T1(1-125m3):%sx%s:%s T2(126-200m3):%sx%s:%s T3(+200m3):%sx%s:%s (IVA 10 inc.)',
		l1,l2,m3,m3_a,round(pvp_a,2),round(p_m3_a,2),m3_b,round(pvp_b,2),round(p_m3_b,2),m3_c,round(pvp_c,2),round(p_m3_c,2));
	
	--RAISE NOTICE 'm3: %',m3;
	--RAISE NOTICE 't1: % t2: %',t1,t2;
	--RAISE NOTICE 'f_a: %, f_b: %, f_c: %',f_a,f_b,f_c;
	--RAISE NOTICE '************************************';
	--RAISE NOTICE 'm3_a: % (% €)',m3_a, p_m3_a;
	--RAISE NOTICE 'm3_b: % (% €)',m3_b, p_m3_b;
	--RAISE NOTICE 'm3_c: % (% €)',m3_c, p_m3_c;
	--RAISE NOTICE 'total con tramos: % €', resultado;
	--RAISE NOTICE 'total sin tramos: % €', pvp_m3 * m3;
	
	RETURN QUERY SELECT id_parcela,m3,t1,t2,pvp_m3,f_a,f_b,f_c,m3_a,m3_b,m3_c,p_m3_a,p_m3_b,p_m3_c,round(resultado,2) AS resultado,resumen;
END;
$$;


ALTER FUNCTION public.detalla_tramos(id_parcela character varying, l1 numeric, l2 numeric, m3 numeric, t1 numeric, t2 numeric, pvp_m3 numeric, f_a numeric, f_b numeric, f_c numeric) OWNER TO me;

--
-- Name: dow2es(timestamp without time zone); Type: FUNCTION; Schema: public; Owner: juanky
--

CREATE FUNCTION public.dow2es(fecha timestamp without time zone) RETURNS character varying
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
	v_dow VARCHAR;
BEGIN
	SELECT INTO v_dow b FROM unnest(ARRAY [0,1,2,3,4,5,6], ARRAY ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']) AS x(a,b) WHERE a = EXTRACT(dow FROM fecha);
	RETURN v_dow;
END;
$$;


ALTER FUNCTION public.dow2es(fecha timestamp without time zone) OWNER TO juanky;

--
-- Name: generate_recurrences(public.recurrence, date, date); Type: FUNCTION; Schema: public; Owner: me
--

CREATE FUNCTION public.generate_recurrences(recurs public.recurrence, start_date date, end_date date) RETURNS SETOF date
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    next_date DATE := start_date;
    duration  INTERVAL;
    day       INTERVAL;
    checkday     TEXT;
BEGIN
    IF recurs = 'none' THEN
        -- Only one date ever.
        RETURN next next_date;
    ELSIF recurs = 'weekly' THEN
        duration := '7 days'::interval;
        WHILE next_date <= end_date LOOP
            RETURN NEXT next_date;
            next_date := next_date + duration;
        END LOOP;
    ELSIF recurs = 'weekdays' THEN
        duration := '7 days'::interval;
        WHILE next_date <= end_date LOOP
            RETURN NEXT next_date;
            next_date := next_date + duration;
        END LOOP;
    ELSIF recurs = '2weeks' THEN
        duration := '14 days'::interval;
        WHILE next_date <= end_date LOOP
            RETURN NEXT next_date;
            next_date := next_date + duration;
        END LOOP;
    ELSIF recurs = 'daily' THEN
        duration := '1 day'::interval;
        WHILE next_date <= end_date LOOP
            RETURN NEXT next_date;
            next_date := next_date + duration;
        END LOOP;
    ELSIF recurs = 'monthly' THEN
        duration := '27 days'::interval;
        day      := '1 day'::interval;
        checkday    := to_char(start_date, 'DD');
        WHILE next_date <= end_date LOOP
            RETURN NEXT next_date;
            next_date := next_date + duration;
            WHILE to_char(next_date, 'DD') <> checkday LOOP
                next_date := next_date + day;
            END LOOP;
        END LOOP;
    ELSE
        -- Someone needs to update this function, methinks.
        RAISE EXCEPTION 'Recurrence % not supported by generate_recurrences()', recurs;
    END IF;
END;
$$;


ALTER FUNCTION public.generate_recurrences(recurs public.recurrence, start_date date, end_date date) OWNER TO me;

--
-- Name: holidays_scheduled_for(integer, timestamp without time zone, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: me
--

CREATE FUNCTION public.holidays_scheduled_for(v_user_id integer, v_starts_at timestamp without time zone, v_ends_at timestamp without time zone) RETURNS TABLE(userid integer, fecha_inicio date, fecha_fin date, title text, class text)
    LANGUAGE plpgsql
    AS $$

BEGIN
	RETURN query
	SELECT v_user_id, generate_recurrences('daily',h.fecha_inicio,h.fecha_fin) AS fecha_ini,
              generate_recurrences('daily',h.fecha_inicio,h.fecha_fin) AS fecha_final,h.title, h.class 
	FROM holidays h
	WHERE user_id = v_user_id  AND h.fecha_inicio BETWEEN v_starts_at AND v_ends_at;	
END $$;


ALTER FUNCTION public.holidays_scheduled_for(v_user_id integer, v_starts_at timestamp without time zone, v_ends_at timestamp without time zone) OWNER TO me;

--
-- Name: match_output_for(integer, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: me
--

CREATE FUNCTION public.match_output_for(for_user_id integer, entrada timestamp without time zone) RETURNS timestamp with time zone
    LANGUAGE plpgsql
    AS $$
DECLARE
	salida timestamptz;
BEGIN
	SELECT INTO salida MIN(momento) AS salida 
	FROM fichajes
       	WHERE accion='S' AND id_user = for_user_id AND momento > entrada;

	RETURN salida;
END;
$$;


ALTER FUNCTION public.match_output_for(for_user_id integer, entrada timestamp without time zone) OWNER TO me;

--
-- Name: match_position_for(integer, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: me
--

CREATE FUNCTION public.match_position_for(for_user_id integer, moment timestamp without time zone) RETURNS point
    LANGUAGE plpgsql
    AS $$
DECLARE
	position point;
BEGIN
	SELECT INTO position lugar 
	FROM fichajes
       	WHERE id_user = for_user_id AND momento = moment;

	RETURN position;
END;
$$;


ALTER FUNCTION public.match_position_for(for_user_id integer, moment timestamp without time zone) OWNER TO me;

--
-- Name: pies_sepa(date, integer, character varying, numeric); Type: FUNCTION; Schema: public; Owner: me
--

CREATE FUNCTION public.pies_sepa(fecha_cobro date, num_recibos integer, id_acreedor character varying, total_importe numeric) RETURNS TABLE(num_lineas integer, reg_totales_acreedor_fecha text, reg_totales_acreedor text, reg_totales_general text)
    LANGUAGE plpgsql
    AS $$
DECLARE
	v_reg_totales_acreedor_fecha text;
	v_reg_totales_acreedor text;
	v_reg_totales_general text;
	v_cont_lineas int :=num_recibos + 2; -- (+ 2 líneas de la cabecera)
	
	-- registro totales de acreedor por fecha de cobro (v_rtaf)
	v_rtaf_1 varchar :='04'; 
	v_rtaf_2 varchar := rpad(id_acreedor,35,' ');
	v_rtaf_3 varchar := to_char(fecha_cobro,'YYYYMMDD');
	v_rtaf_4 varchar := trim(replace(to_char(total_importe,'000000000000000.99'),'.','')); -- 17 posiciones incluidos 2 decimales
	v_rtaf_5 varchar := trim(to_char(num_recibos,'00000000')); -- 8 posiciones (número de adeudos)
	v_rtaf_6 varchar := trim(to_char(v_cont_lineas,'0000000000')); -- 10 posiciones
	v_rtaf_7 varchar := rpad(' ',520,' ');

	-- registro totales acreedor (v_rta)
	v_rta_1 varchar :='05';
	v_rta_2 varchar := v_rtaf_2;
	v_rta_3 varchar := v_rtaf_4;
	v_rta_4 varchar := v_rtaf_5;
	v_rta_5 varchar := trim(to_char(v_cont_lineas + 1,'0000000000')); -- 10 posiciones
	v_rta_6 varchar := rpad(' ',528,' ');

	-- registro totales general
	v_rtg_1 varchar := '99';
	v_rtg_2 varchar := v_rtaf_4;
	v_rtg_3 varchar := v_rtaf_5;
	v_rtg_4 varchar := trim(to_char(v_cont_lineas + 3,'0000000000')); -- 10 posiciones
	v_rtg_5 varchar := rpad(' ',563,' ');

BEGIN
	v_cont_lineas := v_cont_lineas + 3;
	
	v_reg_totales_acreedor_fecha := concat(v_rtaf_1,v_rtaf_2,v_rtaf_3,v_rtaf_4,v_rtaf_5,v_rtaf_6,v_rtaf_7,E'\r\n');
	v_reg_totales_acreedor := concat(v_rta_1,v_rta_2,v_rta_3,v_rta_4,v_rta_5,v_rta_6,E'\r\n');
	v_reg_totales_general := concat(v_rtg_1,v_rtg_2,v_rtg_3,v_rtg_4,v_rtg_5,E'\r\n');

	RETURN QUERY SELECT v_cont_lineas,v_reg_totales_acreedor_fecha,v_reg_totales_acreedor,v_reg_totales_general;
END;
$$;


ALTER FUNCTION public.pies_sepa(fecha_cobro date, num_recibos integer, id_acreedor character varying, total_importe numeric) OWNER TO me;

--
-- Name: planned_scheduled_for(integer, timestamp without time zone, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: me
--

CREATE FUNCTION public.planned_scheduled_for(v_user_id integer, v_starts_at timestamp without time zone, v_ends_at timestamp without time zone) RETURNS TABLE(id integer, userid integer, fecha text, dia character varying, empleado text, inicia timestamp without time zone, termina timestamp without time zone, duracion interval, label character varying, recurrence public.recurrence)
    LANGUAGE plpgsql
    AS $$
BEGIN
	RETURN query
	(SELECT e.id, user_id, to_char(starts_at::timestamp,'DD-MM-YYYY') AS fecha, 
		dow2es(starts_at::timestamp) AS dia, 
		title AS empleado, 
		starts_at::timestamp AS inicia, 
		ends_at::timestamp AS termina, 
		duration AS duracion,
		e.label,
		e.recurrence
		FROM recurring_events_for(v_user_id,v_starts_at,v_ends_at) AS e 
		WHERE starts_at::date NOT IN (SELECT publicholidays.fecha FROM publicholidays) 
		AND 
			starts_at::date NOT IN (SELECT generate_recurrences('daily',fecha_inicio,fecha_fin) FROM holidays WHERE user_id=v_user_id )
	);
	
	--UNION
	--(SELECT 0 AS id,'none' AS recurrence,* from vista_extrahours_scheduled v WHERE v.user_id = v_user_id AND v.fecha::date BETWEEN v_starts_at AND v_ends_at)
	--;
END $$;


ALTER FUNCTION public.planned_scheduled_for(v_user_id integer, v_starts_at timestamp without time zone, v_ends_at timestamp without time zone) OWNER TO me;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: events; Type: TABLE; Schema: public; Owner: me
--

CREATE TABLE public.events (
    id integer NOT NULL,
    user_id integer NOT NULL,
    starts_at timestamp without time zone NOT NULL,
    start_tz text DEFAULT 'Europe/Madrid'::text NOT NULL,
    ends_at timestamp without time zone,
    end_tz text DEFAULT 'Europe/Madrid'::text NOT NULL,
    recurrence public.recurrence DEFAULT 'none'::text NOT NULL,
    title text,
    duration interval,
    label character varying NOT NULL
);


ALTER TABLE public.events OWNER TO me;

--
-- Name: recurring_events_all(timestamp without time zone, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: me
--

CREATE FUNCTION public.recurring_events_all(range_start timestamp without time zone, range_end timestamp without time zone) RETURNS SETOF public.events
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    event 	events;
    start_date 	TIMESTAMPTZ;
    start_time 	TEXT;
    ends_at    	TIMESTAMPTZ;
    next_date  	DATE;
    recurs_at  	TIMESTAMPTZ;
BEGIN
    FOR event IN 
        SELECT *
          FROM events
         WHERE (
                   recurrence <> 'none'
               OR  (
                      recurrence = 'none'
                  AND starts_at BETWEEN range_start AND range_end
               )
           )
    LOOP
        IF event.recurrence = 'none' THEN
            RETURN NEXT event;
            CONTINUE;
        END IF;

        start_date := event.starts_at::timestamptz AT TIME ZONE event.start_tz;
        start_time := start_date::time::text;
        ends_at    := event.ends_at::timestamptz AT TIME ZONE event.end_tz;

        FOR next_date IN
            SELECT *
                FROM generate_recurrences(
                        event.recurrence,
                        start_date::date,
                        (range_end AT TIME ZONE event.start_tz)::date
                )
        LOOP
            recurs_at := (next_date || ' ' || start_time)::timestamp
                AT TIME ZONE event.start_tz;
            EXIT WHEN recurs_at > range_end;
            CONTINUE WHEN recurs_at < range_start AND ends_at < range_start;
            event.starts_at := recurs_at;
            event.ends_at   := recurs_at + event.duration;
      	    --RAISE NOTICE 'event.ends_at: %',event.ends_at;		
            RETURN NEXT event;
        END LOOP;
    END LOOP;
    RETURN;
END;
$$;


ALTER FUNCTION public.recurring_events_all(range_start timestamp without time zone, range_end timestamp without time zone) OWNER TO me;

--
-- Name: recurring_events_for(integer, timestamp without time zone, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: me
--

CREATE FUNCTION public.recurring_events_for(for_user_id integer, range_start timestamp without time zone, range_end timestamp without time zone) RETURNS SETOF public.events
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    event 	    events;
    start_date 	TIMESTAMPTZ;
    start_time 	TEXT;
    ends_at    	TIMESTAMPTZ;
    next_date  	DATE;
    recurs_at  	TIMESTAMPTZ;
BEGIN
    FOR event IN 
        SELECT *
          FROM events
         WHERE user_id = for_user_id
           AND (
                    recurrence <> 'none'
               OR  
                    (recurrence = 'none' AND starts_at BETWEEN range_start AND range_end)
           )
    LOOP
        IF event.recurrence = 'none' THEN
            RETURN NEXT event;
            CONTINUE;
        END IF;
    
        start_date := event.starts_at::timestamptz AT TIME ZONE event.start_tz;
        start_time := start_date::time::text;
        ends_at    := event.ends_at::timestamptz AT TIME ZONE event.end_tz;

        FOR next_date IN
            SELECT *
                FROM generate_recurrences(
                        event.recurrence,
                        start_date::date,
                        (range_end AT TIME ZONE event.start_tz)::date
                )
        LOOP
            recurs_at := (next_date || ' ' || start_time)::timestamp AT TIME ZONE event.start_tz;
            EXIT WHEN recurs_at > range_end;
            CONTINUE WHEN recurs_at < range_start AND ends_at < range_start;
            event.starts_at := recurs_at;
            event.ends_at   := recurs_at + event.duration;
      	    --RAISE NOTICE 'ends_at: %',ends_at;		
            RETURN NEXT event;
        END LOOP;
    END LOOP;
    RETURN;
END;
$$;


ALTER FUNCTION public.recurring_events_for(for_user_id integer, range_start timestamp without time zone, range_end timestamp without time zone) OWNER TO me;

--
-- Name: reg_individual_agua_sepa(date); Type: FUNCTION; Schema: public; Owner: me
--

CREATE FUNCTION public.reg_individual_agua_sepa(fecha_cobro date) RETURNS TABLE(num_recibos integer, total numeric, datos text)
    LANGUAGE plpgsql
    AS $$
DECLARE
v_id_parcela varchar;
v_titular varchar;
v_bic varchar;
v_iban varchar;
v_importe numeric;
v_concepto varchar;
v_fecha_mandato date;
remesa_cursor CURSOR FOR SELECT id_parcela,titular,bic,iban,importe,concepto,fecha_mandato FROM vista_remesa_agua_sepa;
v_registro text;
v_num_recibos integer :=0;
v_total numeric :=0.0;
v_c1 varchar :='03';
v_c2 varchar :='19143';
v_c3 varchar :='003';
v_c4 varchar ; --posibilidad de personalizar el adeudo
v_c5 varchar ;
v_c6 varchar :='RCUR'; --posibilidades: FRST | FNAL | OOFF | RCUR
v_c7 varchar :='TREA'; --categoría de propósito ('TREA: Pago de tesorería)
v_c8 varchar ; -- Importe del adeudo con un máximo de once posiciones, incluyendo dos posiciones decimales sin reflejar la coma.
v_c9 varchar :='20140201'; -- fecha de firma del mandato (actualmenre la entrada en vigor de SEPA) mejora: cambiarlo por el real
v_c10 varchar ; --bic
v_c11 varchar ; -- titular
v_c12_c18 varchar := rpad(' ',214,' '); -- campos optativos, rellenados con ' '
v_c19  char := 'A'; -- Identificación de la cuenta del deudor: A = IBAN
v_c20 varchar ; --iban
v_c21 varchar := 'MSVC'; --propósito del adeudo: MULTIPLE SERVICE TIPES
v_c22 varchar ; -- concepto del adeudo
v_c23 varchar := rpad(' ',19,' '); -- libre

BEGIN
	OPEN remesa_cursor;
	LOOP
      FETCH NEXT FROM remesa_cursor INTO v_id_parcela, v_titular, v_bic, v_iban, v_importe, v_concepto,v_fecha_mandato;
      EXIT WHEN NOT FOUND;
      --RAISE NOTICE 'ID parcela: %, Name: %', v_id_parcela, v_titular;
      v_c4:=rpad(concat('CONSUMO AGUA',v_id_parcela,to_char(fecha_cobro,'YYYYMMDD')),35,' ');
      v_c5:=rpad(v_id_parcela,35,' ');
      v_c8:=trim(replace(to_char(v_importe,'000000000.99'),'.','')); 
      v_c9:=to_char(v_fecha_mandato,'YYYYMMDD');
      v_c10:=rpad(v_bic,11,' ');
      v_c11:=rpad(v_titular,70,' ');
      v_c20:=rpad(v_iban,34,' ');
      v_c22:=rpad(v_concepto,140,' ');
      v_registro := concat(v_registro,v_c1,v_c2,v_c3,v_c4,v_c5,v_c6,v_c7,v_c8,v_c9,v_c10,v_c11,v_c12_c18,v_c19,v_c20,v_c21,v_c22,v_c23,E'\r\n');
      v_num_recibos := v_num_recibos + 1;
      v_total := v_total + v_importe; 
   END LOOP;
   CLOSE remesa_cursor;
	
	RETURN QUERY SELECT v_num_recibos,v_total,v_registro;
END;
$$;


ALTER FUNCTION public.reg_individual_agua_sepa(fecha_cobro date) OWNER TO me;

--
-- Name: reg_individual_cuotas_sepa(date); Type: FUNCTION; Schema: public; Owner: me
--

CREATE FUNCTION public.reg_individual_cuotas_sepa(fecha_cobro date) RETURNS TABLE(num_recibos integer, total numeric, datos text)
    LANGUAGE plpgsql
    AS $$

DECLARE
v_id_parcela varchar;
v_titular varchar;
v_bic varchar;
v_iban varchar;
v_cuota numeric;
v_dto numeric;
v_domiciliado numeric;
v_bonificacion numeric;
v_fecha_mandato date;
remesa_cursor CURSOR FOR SELECT id_parcela,titular,bic,iban,cuota,dto,domiciliado,fecha_mandato 
   FROM vista_cuotas
   WHERE fecha=(SELECT MAX(fecha) FROM cuotas) AND cuota > 0 AND domiciliado > 0;
v_registro text;
v_num_recibos integer :=0;
v_total numeric :=0.0;
v_concepto varchar;
v_c1 varchar :='03';
v_c2 varchar :='19143';
v_c3 varchar :='003';
v_c4 varchar ; --posibilidad de personalizar el adeudo
v_c5 varchar ;
v_c6 varchar :='RCUR'; --posibilidades: FRST | FNAL | OOFF | RCUR
v_c7 varchar :='TREA'; --categoría de propósito ('TREA: Pago de tesorería)
v_c8 varchar ; -- Importe del adeudo con un máximo de once posiciones, incluyendo dos posiciones decimales sin reflejar la coma.
v_c9 varchar :='20140201'; -- fecha de firma del mandato (actualmenre la entrada en vigor de SEPA) mejora: cambiarlo por el real
v_c10 varchar ; --bic
v_c11 varchar ; -- titular
v_c12_c18 varchar := rpad(' ',214,' '); -- campos optativos, rellenados con ' '
v_c19  char := 'A'; -- Identificación de la cuenta del deudor: A = IBAN
v_c20 varchar ; --iban
v_c21 varchar := 'MSVC'; --propósito del adeudo: MULTIPLE SERVICE TIPES
v_c22 varchar ; -- concepto del adeudo
v_c23 varchar := rpad(' ',19,' '); -- libre

BEGIN
	OPEN remesa_cursor;
	LOOP
      FETCH NEXT FROM remesa_cursor INTO v_id_parcela, v_titular, v_bic, v_iban, v_cuota, v_dto, v_domiciliado,v_fecha_mandato;
      EXIT WHEN NOT FOUND;
      --RAISE NOTICE 'ID parcela: %, Name: %', v_id_parcela, v_titular;
      v_bonificacion:=v_cuota - v_domiciliado;
      v_concepto:= concat('CUOTAS COMUNIDAD SIERRAMAR: ',v_cuota,' DTO. POR DOMICILIACION: ',v_dto,
         ' BONIFICACION APLICADA: ',v_bonificacion, ' TOTAL: ',v_domiciliado,' EUROS' );
      v_c4:=rpad(concat('CUOTA SIERRAMAR',v_id_parcela,to_char(fecha_cobro,'YYYYMMDD')),35,' ');
      v_c5:=rpad(v_id_parcela,35,' ');
      v_c8:=trim(replace(to_char(v_domiciliado,'000000000.99'),'.','')); 
      v_c9:=to_char(v_fecha_mandato,'YYYYMMDD');
      v_c10:=rpad(v_bic,11,' ');
      v_c11:=rpad(v_titular,70,' ');
      v_c20:=rpad(v_iban,34,' ');
      v_c22:=rpad(v_concepto,140,' ');
      v_registro := concat(v_registro,v_c1,v_c2,v_c3,v_c4,v_c5,v_c6,v_c7,v_c8,v_c9,v_c10,v_c11,v_c12_c18,v_c19,v_c20,v_c21,v_c22,v_c23,E'\r\n');
      v_num_recibos := v_num_recibos + 1;
      v_total := v_total + v_domiciliado; 
   END LOOP;
   CLOSE remesa_cursor;
	
	RETURN QUERY SELECT v_num_recibos,v_total,v_registro;
END;
$$;


ALTER FUNCTION public.reg_individual_cuotas_sepa(fecha_cobro date) OWNER TO me;

--
-- Name: reg_individual_sepa(date, integer[]); Type: FUNCTION; Schema: public; Owner: juanky
--

CREATE FUNCTION public.reg_individual_sepa(fecha_cobro date, selected_ids integer[]) RETURNS TABLE(num_recibos integer, total numeric, datos text)
    LANGUAGE plpgsql
    AS $$
DECLARE
v_id_parcela varchar;
v_id_remesa integer;
v_titular varchar;
v_bic varchar;
v_iban varchar;
v_importe numeric;
v_concepto varchar;
v_fecha_mandato date;
remesa_cursor CURSOR FOR SELECT id_remesa,id_parcela,titular,bic,iban,importe,concepto,fecha_mandato FROM remesas_especiales WHERE id_remesa= ANY (selected_ids);
v_registro text;
v_num_recibos integer :=0;
v_total numeric :=0.0;
v_c1 varchar :='03';
v_c2 varchar :='19143';
v_c3 varchar :='003';
v_c4 varchar ; --posibilidad de personalizar el adeudo
v_c5 varchar ;
v_c6 varchar :='FRST'; --posibilidades: FRST | FNAL | OOFF | RCUR
v_c7 varchar :='TREA'; --categoría de propósito ('TREA: Pago de tesorería)
v_c8 varchar ; -- Importe del adeudo con un máximo de once posiciones, incluyendo dos posiciones decimales sin reflejar la coma.
v_c9 varchar :='20140201'; -- fecha de firma del mandato (actualmenre la entrada en vigor de SEPA) mejora: cambiarlo por el real
v_c10 varchar ; --bic
v_c11 varchar ; -- titular
v_c12_c18 varchar := rpad(' ',214,' '); -- campos optativos, rellenados con ' '
v_c19  char := 'A'; -- Identificación de la cuenta del deudor: A = IBAN
v_c20 varchar ; --iban
v_c21 varchar := 'MSVC'; --propósito del adeudo: MULTIPLE SERVICE TIPES
v_c22 varchar ; -- concepto del adeudo
v_c23 varchar := rpad(' ',19,' '); -- libre

BEGIN
	OPEN remesa_cursor;
	LOOP
      FETCH NEXT FROM remesa_cursor INTO v_id_remesa,v_id_parcela, v_titular, v_bic, v_iban, v_importe, v_concepto, v_fecha_mandato;
      EXIT WHEN NOT FOUND;
      --RAISE NOTICE 'ID parcela: %, Name: %', v_id_parcela, v_titular;
      v_c4:=rpad(concat('ADEUDO',v_id_parcela,v_id_remesa,to_char(fecha_cobro,'YYYYMMDD')),35,' ');
      v_c5:=rpad(v_id_parcela,35,' ');
      v_c8:=trim(replace(to_char(v_importe,'000000000.99'),'.','')); 
      v_c9:=to_char(v_fecha_mandato,'YYYYMMDD');
      v_c10:=rpad(v_bic,11,' ');
      v_c11:=rpad(v_titular,70,' ');
      v_c20:=rpad(v_iban,34,' ');
      v_c22:=rpad(v_concepto,140,' ');

      v_registro := concat(v_registro,v_c1,v_c2,v_c3,v_c4,v_c5,v_c6,v_c7,v_c8,v_c9,v_c10,v_c11,v_c12_c18,v_c19,v_c20,v_c21,v_c22,v_c23,E'\r\n');
      v_num_recibos := v_num_recibos + 1;
      v_total := v_total + v_importe; 
   END LOOP;
   CLOSE remesa_cursor;
	
	RETURN QUERY SELECT v_num_recibos,v_total,v_registro;
END;
$$;


ALTER FUNCTION public.reg_individual_sepa(fecha_cobro date, selected_ids integer[]) OWNER TO juanky;

--
-- Name: remesa_agua_fecha(date); Type: FUNCTION; Schema: public; Owner: me
--

CREATE FUNCTION public.remesa_agua_fecha(fechalectura date) RETURNS TABLE(fecha date, id_parcela character varying, titular character varying, titular_cc character varying, bic character varying, iban character varying, l1 integer, l2 integer, m3 integer, pm3 numeric, t1 numeric, t2 numeric, f_a numeric, f_b numeric, f_c numeric, domicilia_bco boolean, domiciliado numeric, averiado boolean, notas text, estado character, ult_modif timestamp with time zone, user_modif character varying, inactivo boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE

BEGIN
	RETURN QUERY SELECT a.fecha,
    a.id_parcela,
    s.titular,
    s.titular_cc_agua AS titular_cc,
    s.bic_agua AS bic,
    s.iban_agua AS iban,
    a.l1,
    a.l2,   
    a.m3,
    a.pm3,
    a.t1,
    a.t2,
    a.f_a,
    a.f_b,
    a.f_c,
    a.domicilia_bco,
        CASE
            WHEN (a.domicilia_bco IS FALSE) THEN (0)::numeric
            ELSE round(calcula_tramos(a.m3::numeric,a.t1,a.t2,a.pm3,a.f_a,a.f_b,a.f_c),2)::numeric
        END AS domiciliado,
    a.averiado,
    a.notas,
    a.estado,
    a.ult_modif,
    a.user_modif,
    a.inactivo
    FROM agua a JOIN socios s ON s.id_parcela=a.id_parcela
    WHERE a.fecha = fechalectura AND a.estado<>'A' AND a.inactivo='f' ORDER BY id_parcela;
END;
$$;


ALTER FUNCTION public.remesa_agua_fecha(fechalectura date) OWNER TO me;

--
-- Name: remesa_agua_sepa(date); Type: FUNCTION; Schema: public; Owner: juanky
--

CREATE FUNCTION public.remesa_agua_sepa(fecha_cobro date) RETURNS TABLE(fecha date, recibos integer, lineas integer, total_importe numeric, remesa text)
    LANGUAGE plpgsql
    AS $$
DECLARE
	v_num_recibos int :=0;
	v_num_lineas_cabeceras int :=0;
	v_num_lineas_pies int :=0;
	v_total_lineas int :=0;
	v_total_importe numeric :=0;
	v_cabecera_presentador text ;
	v_cabecera_acreedor text;
	v_id_acreedor varchar;
	v_reg_indiv_oblig text;
	v_reg_totales_acreedor_fecha text;
	v_reg_totales_acreedor text;
	v_reg_totales_general text;
	v_remesa text := 'hola desde remesa_sepa';
BEGIN
	--cabeceras sepa
	SELECT acreedor,num_lineas,cabecera_presentador,cabecera_acreedor 
		INTO v_id_acreedor,v_num_lineas_cabeceras,v_cabecera_presentador,v_cabecera_acreedor 
	FROM cabeceras_sepa(fecha_cobro);

	-- registro individual obligatorio
	SELECT num_recibos,total,datos 
		INTO v_num_recibos,v_total_importe,v_reg_indiv_oblig
	FROM reg_individual_agua_sepa(fecha_cobro); 

	--pies sepa
	SELECT num_lineas,reg_totales_acreedor_fecha,reg_totales_acreedor,reg_totales_general 
		INTO v_num_lineas_pies,v_reg_totales_acreedor_fecha,v_reg_totales_acreedor,v_reg_totales_general
	FROM pies_sepa(fecha_cobro,v_num_recibos,v_id_acreedor,v_total_importe);
	
	v_remesa := concat(
					v_cabecera_presentador,
					v_cabecera_acreedor,
					v_reg_indiv_oblig,
					v_reg_totales_acreedor_fecha,
					v_reg_totales_acreedor,
					v_reg_totales_general
				);
	v_total_lineas := v_num_lineas_cabeceras + v_num_recibos + v_num_lineas_pies;

	RETURN QUERY SELECT fecha_cobro,v_num_recibos,v_total_lineas,v_total_importe,v_remesa;
END;
$$;


ALTER FUNCTION public.remesa_agua_sepa(fecha_cobro date) OWNER TO juanky;

--
-- Name: remesa_cuotas_sepa(date); Type: FUNCTION; Schema: public; Owner: juanky
--

CREATE FUNCTION public.remesa_cuotas_sepa(fecha_cobro date) RETURNS TABLE(fecha date, recibos integer, lineas integer, total_importe numeric, remesa text)
    LANGUAGE plpgsql
    AS $$
DECLARE
	v_num_recibos int :=0;
	v_num_lineas_cabeceras int :=0;
	v_num_lineas_pies int :=0;
	v_total_lineas int :=0;
	v_total_importe numeric :=0;
	v_cabecera_presentador text ;
	v_cabecera_acreedor text;
	v_id_acreedor varchar;
	v_reg_indiv_oblig text;
	v_reg_totales_acreedor_fecha text;
	v_reg_totales_acreedor text;
	v_reg_totales_general text;
	v_remesa text := 'hola desde remesa_sepa';
BEGIN
	--cabeceras sepa
	SELECT acreedor,num_lineas,cabecera_presentador,cabecera_acreedor 
		INTO v_id_acreedor,v_num_lineas_cabeceras,v_cabecera_presentador,v_cabecera_acreedor 
	FROM cabeceras_sepa(fecha_cobro);

	-- registro individual obligatorio
	SELECT num_recibos,total,datos 
		INTO v_num_recibos,v_total_importe,v_reg_indiv_oblig
	FROM reg_individual_cuotas_sepa(fecha_cobro); 

	--pies sepa
	SELECT num_lineas,reg_totales_acreedor_fecha,reg_totales_acreedor,reg_totales_general 
		INTO v_num_lineas_pies,v_reg_totales_acreedor_fecha,v_reg_totales_acreedor,v_reg_totales_general
	FROM pies_sepa(fecha_cobro,v_num_recibos,v_id_acreedor,v_total_importe);
	
	v_remesa := concat(
					v_cabecera_presentador,
					v_cabecera_acreedor,
					v_reg_indiv_oblig,
					v_reg_totales_acreedor_fecha,
					v_reg_totales_acreedor,
					v_reg_totales_general
				);
	v_total_lineas := v_num_lineas_cabeceras + v_num_recibos + v_num_lineas_pies;

	RETURN QUERY SELECT fecha_cobro,v_num_recibos,v_total_lineas,v_total_importe,v_remesa;
END;
$$;


ALTER FUNCTION public.remesa_cuotas_sepa(fecha_cobro date) OWNER TO juanky;

--
-- Name: remesa_sepa(date, integer[]); Type: FUNCTION; Schema: public; Owner: juanky
--

CREATE FUNCTION public.remesa_sepa(fecha_cobro date, selected_ids integer[]) RETURNS TABLE(fecha date, recibos integer, lineas integer, total_importe numeric, remesa text)
    LANGUAGE plpgsql
    AS $$
DECLARE
	v_num_recibos int :=0;
	v_num_lineas_cabeceras int :=0;
	v_num_lineas_pies int :=0;
	v_total_lineas int :=0;
	v_total_importe numeric :=0;
	v_cabecera_presentador text ;
	v_cabecera_acreedor text;
	v_id_acreedor varchar;
	v_reg_indiv_oblig text;
	v_reg_totales_acreedor_fecha text;
	v_reg_totales_acreedor text;
	v_reg_totales_general text;
	v_remesa text := 'hola desde remesa_sepa';
BEGIN
	--cabeceras sepa
	SELECT acreedor,num_lineas,cabecera_presentador,cabecera_acreedor 
		INTO v_id_acreedor,v_num_lineas_cabeceras,v_cabecera_presentador,v_cabecera_acreedor 
	FROM cabeceras_sepa(fecha_cobro);

	-- registro individual obligatorio
	SELECT num_recibos,total,datos 
		INTO v_num_recibos,v_total_importe,v_reg_indiv_oblig
	FROM reg_individual_sepa(fecha_cobro,selected_ids); 

	--pies sepa
	SELECT num_lineas,reg_totales_acreedor_fecha,reg_totales_acreedor,reg_totales_general 
		INTO v_num_lineas_pies,v_reg_totales_acreedor_fecha,v_reg_totales_acreedor,v_reg_totales_general
	FROM pies_sepa(fecha_cobro,v_num_recibos,v_id_acreedor,v_total_importe);
	
	v_remesa := concat(
					v_cabecera_presentador,
					v_cabecera_acreedor,
					v_reg_indiv_oblig,
					v_reg_totales_acreedor_fecha,
					v_reg_totales_acreedor,
					v_reg_totales_general
				);
	v_total_lineas := v_num_lineas_cabeceras + v_num_recibos + v_num_lineas_pies;

	RETURN QUERY SELECT fecha_cobro,v_num_recibos,v_total_lineas,v_total_importe,v_remesa;
END;
$$;


ALTER FUNCTION public.remesa_sepa(fecha_cobro date, selected_ids integer[]) OWNER TO juanky;

--
-- Name: resident_info(text); Type: FUNCTION; Schema: public; Owner: me
--

CREATE FUNCTION public.resident_info(my_chunk text) RETURNS TABLE(id integer, name character varying, email character varying, id_parcela character varying[], id_parcela_agua character varying[])
    LANGUAGE plpgsql
    AS $$
DECLARE

BEGIN
	RAISE NOTICE 'my_chunk: %',my_chunk;		
	RETURN QUERY  SELECT DISTINCT v.id, v.name, v.email, 
			ARRAY(SELECT p.id_parcela FROM vista_user_socio AS p WHERE p.id=v.id) as id_parcela,
			ARRAY(SELECT a.id_parcela from vista_user_socio_agua AS a where a.id=v.id) as id_parcela_agua 
		FROM vista_user_socio AS v 
		WHERE v.name ILIKE '%'||my_chunk||'%' OR v.id_parcela = my_chunk;	
END;
$$;


ALTER FUNCTION public.resident_info(my_chunk text) OWNER TO me;

--
-- Name: resident_info_userid(character varying); Type: FUNCTION; Schema: public; Owner: juanky
--

CREATE FUNCTION public.resident_info_userid(user_email character varying) RETURNS TABLE(id integer, name character varying, email character varying, id_parcela character varying[], id_parcela_agua character varying[], roles text[], passwd character varying)
    LANGUAGE plpgsql
    AS $$
DECLARE

BEGIN
	RETURN QUERY  SELECT DISTINCT v.id, v.name, v.email, 
			ARRAY(SELECT p.id_parcela FROM vista_user_socio AS p WHERE p.id=v.id) as id_parcela,
			ARRAY(SELECT a.id_parcela from vista_user_socio_agua AS a where a.id=v.id) as id_parcela_agua,
			v.roles,v.passwd
		FROM vista_user_socio AS v 
		WHERE v.email = user_email;	
END;
$$;


ALTER FUNCTION public.resident_info_userid(user_email character varying) OWNER TO juanky;

--
-- Name: fichajes; Type: TABLE; Schema: public; Owner: me
--

CREATE TABLE public.fichajes (
    id_user integer NOT NULL,
    momento timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    lugar point,
    accion character(1),
    locatedat timestamp with time zone,
    CONSTRAINT fichajes_accion_check CHECK (((accion = 'E'::bpchar) OR (accion = 'S'::bpchar)))
);


ALTER TABLE public.fichajes OWNER TO me;

--
-- Name: vista_fichajes; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.vista_fichajes AS
 SELECT id_user,
    (momento)::date AS fecha,
    momento AS entrada,
    lugar AS lugar_entrada,
    public.match_output_for(id_user, (momento)::timestamp without time zone) AS salida,
    public.match_position_for(id_user, (public.match_output_for(id_user, (momento)::timestamp without time zone))::timestamp without time zone) AS lugar_salida,
    (public.match_output_for(id_user, (momento)::timestamp without time zone) - momento) AS duracion
   FROM public.fichajes
  WHERE (accion = 'E'::bpchar);


ALTER VIEW public.vista_fichajes OWNER TO me;

--
-- Name: signings_report_for(integer, timestamp without time zone, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: me
--

CREATE FUNCTION public.signings_report_for(for_user_id integer, range_start timestamp without time zone, range_end timestamp without time zone) RETURNS SETOF public.vista_fichajes
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    	event events;
	next_date DATE;
	fichaje vista_fichajes;
BEGIN
        FOR next_date IN
		SELECT *
		FROM generate_recurrences(
			'daily',
			range_start::date,
			range_end::date
		)
	LOOP
		FOR fichaje IN
			SELECT *
			FROM vista_fichajes f
			WHERE f.id_user::int = for_user_id
			AND f.entrada::date = next_date
		LOOP
			--entrada := f.entrada::timestamp;
			--RAISE NOTICE 'salida: %',f.salida;
			--salida := f.salida::timestamp;
			--duracion := f.duracion::interval;
			fichaje.fecha := next_date;
			RETURN NEXT fichaje;
			fichaje.fecha := null;
			--entrada := null;
			--salida := null;
			--duracion := null;
		END LOOP;
    END LOOP;
END;
$$;


ALTER FUNCTION public.signings_report_for(for_user_id integer, range_start timestamp without time zone, range_end timestamp without time zone) OWNER TO me;

--
-- Name: simula_tramos(date, numeric, numeric, numeric, numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: me
--

CREATE FUNCTION public.simula_tramos(fechalectura date, v_t1 numeric, v_t2 numeric, v_pvp_m3 numeric, v_f_a numeric, v_f_b numeric, v_f_c numeric) RETURNS TABLE(fecha date, id_parcela character varying, m3 integer, valor_lineal numeric, valor_tramos numeric)
    LANGUAGE plpgsql
    AS $$
DECLARE

BEGIN
	RETURN QUERY SELECT a.fecha, a.id_parcela AS parcela, a.m3, (a.m3 * v_pvp_m3) AS valor_lineal,
		calcula_tramos(a.m3,v_t1,v_t2,v_pvp_m3,v_f_a,v_f_b,v_f_c) AS valor_tramos FROM agua AS a WHERE a.fecha = fechalectura AND a.m3 > 0 ORDER BY a.id_parcela;
END;
$$;


ALTER FUNCTION public.simula_tramos(fechalectura date, v_t1 numeric, v_t2 numeric, v_pvp_m3 numeric, v_f_a numeric, v_f_b numeric, v_f_c numeric) OWNER TO me;

--
-- Name: simula_tramos_anual(integer, numeric, numeric, numeric, numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: me
--

CREATE FUNCTION public.simula_tramos_anual(my_year integer, v_t1 numeric, v_t2 numeric, v_pvp_m3 numeric, v_f_a numeric, v_f_b numeric, v_f_c numeric) RETURNS TABLE(fecha date, id_parcela character varying, m3 integer, valor_lineal numeric, valor_tramos numeric)
    LANGUAGE plpgsql
    AS $$
DECLARE

BEGIN
	RETURN QUERY SELECT a.fecha, a.id_parcela AS parcela, a.m3, (a.m3 * v_pvp_m3) AS valor_lineal,
		calcula_tramos(a.m3,v_t1,v_t2,v_pvp_m3,v_f_a,v_f_b,v_f_c) AS valor_tramos 
	FROM agua AS a WHERE date_part('year',a.fecha) = my_year AND a.m3 > 0 ORDER BY a.id_parcela;
END;
$$;


ALTER FUNCTION public.simula_tramos_anual(my_year integer, v_t1 numeric, v_t2 numeric, v_pvp_m3 numeric, v_f_a numeric, v_f_b numeric, v_f_c numeric) OWNER TO me;

--
-- Name: num_recibo_agua; Type: SEQUENCE; Schema: public; Owner: me
--

CREATE SEQUENCE public.num_recibo_agua
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.num_recibo_agua OWNER TO me;

--
-- Name: agua; Type: TABLE; Schema: public; Owner: me
--

CREATE TABLE public.agua (
    id_parcela character varying(4) NOT NULL,
    fecha date NOT NULL,
    l1 integer NOT NULL,
    l2 integer,
    m3 integer,
    pm3 numeric(4,3),
    ult_modif timestamp with time zone,
    user_modif character varying(40),
    averiado boolean,
    notas text,
    estado character(1) DEFAULT 'A'::bpchar,
    domicilia_bco boolean,
    num_recibo integer DEFAULT nextval('public.num_recibo_agua'::regclass),
    t1 numeric,
    t2 numeric,
    f_a numeric,
    f_b numeric,
    f_c numeric,
    inactivo boolean,
    CONSTRAINT agua_estado_chk CHECK (((estado)::text = ANY (ARRAY['A'::text, 'R'::text, 'C'::text])))
);


ALTER TABLE public.agua OWNER TO me;

--
-- Name: contadores_riego; Type: TABLE; Schema: public; Owner: me
--

CREATE TABLE public.contadores_riego (
    id_contador integer NOT NULL,
    lugar character varying(80) NOT NULL
);


ALTER TABLE public.contadores_riego OWNER TO me;

--
-- Name: contadores_suministro; Type: TABLE; Schema: public; Owner: me
--

CREATE TABLE public.contadores_suministro (
    id_contador integer NOT NULL,
    lugar character varying(80) NOT NULL
);


ALTER TABLE public.contadores_suministro OWNER TO me;

--
-- Name: cuotas; Type: TABLE; Schema: public; Owner: me
--

CREATE TABLE public.cuotas (
    id_parcela character varying(4) NOT NULL,
    fecha date NOT NULL,
    cuota numeric(6,2),
    notas text,
    dto numeric(4,2),
    domicilia_bco boolean,
    estado character(1) DEFAULT 'R'::bpchar NOT NULL,
    CONSTRAINT cuotas_estado_chk CHECK ((estado = ANY (ARRAY['R'::bpchar, 'C'::bpchar])))
);


ALTER TABLE public.cuotas OWNER TO me;

--
-- Name: vista_agua_parcela; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.vista_agua_parcela AS
 SELECT id_parcela,
    fecha,
    date_part('quarter'::text, fecha) AS trimestre,
    m3
   FROM public.agua;


ALTER VIEW public.vista_agua_parcela OWNER TO me;

--
-- Name: estadistica_agua_parcela; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.estadistica_agua_parcela AS
 SELECT id_parcela,
    trimestre,
    max(m3) AS max,
    min(m3) AS min,
    round(avg(m3), 2) AS avg,
    round(stddev_pop(m3), 2) AS stddev
   FROM public.vista_agua_parcela
  GROUP BY id_parcela, trimestre
  ORDER BY id_parcela, trimestre;


ALTER VIEW public.estadistica_agua_parcela OWNER TO me;

--
-- Name: socios; Type: TABLE; Schema: public; Owner: me
--

CREATE TABLE public.socios (
    id_parcela character varying(4) NOT NULL,
    titular character varying(80) NOT NULL,
    titular_cc_agua character varying(80),
    cc_agua character varying(20),
    titular_cc_cuota character varying(80),
    cc_cuota character varying(80),
    email character varying(80),
    domicilio character varying(80),
    localidad character varying(80),
    telef1 character varying(13),
    telef2 character varying(13),
    telef3 character varying(13),
    cp character varying(5),
    notas text,
    bic_agua character varying(11),
    bic_cuota character varying(11),
    iban_agua character varying(24),
    iban_cuota character varying(24),
    email2 character varying(80),
    titular2 character varying(80),
    geolocation point,
    fecha_mandato date,
    nif_titular_cc_agua character varying(9)
);


ALTER TABLE public.socios OWNER TO me;

--
-- Name: vista_agua; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.vista_agua AS
 SELECT a.fecha,
    a.id_parcela,
    s.titular,
    s.titular_cc_agua AS titular_cc,
    s.bic_agua AS bic,
    s.iban_agua AS iban,
    a.l1,
    a.l2,
    a.m3,
    ea.avg,
    ea.stddev,
    a.pm3,
    a.t1,
    a.t2,
    a.f_a,
    a.f_b,
    a.f_c,
    round(public.calcula_tramos((a.m3)::numeric, a.t1, a.t2, a.pm3, a.f_a, a.f_b, a.f_c), 2) AS importe,
    a.domicilia_bco,
        CASE
            WHEN (a.domicilia_bco IS FALSE) THEN (0)::numeric
            ELSE round(public.calcula_tramos((a.m3)::numeric, a.t1, a.t2, a.pm3, a.f_a, a.f_b, a.f_c), 2)
        END AS domiciliado,
    a.averiado,
    a.notas,
    a.estado,
        CASE
            WHEN (a.estado = 'A'::bpchar) THEN '🟢'::text
            WHEN (a.estado = 'R'::bpchar) THEN '🟠'::text
            ELSE '🔴'::text
        END AS e,
    a.inactivo
   FROM ((public.agua a
     JOIN public.socios s ON (((s.id_parcela)::text = (a.id_parcela)::text)))
     JOIN public.estadistica_agua_parcela ea ON ((((a.id_parcela)::text = (ea.id_parcela)::text) AND (ea.trimestre = (EXTRACT(quarter FROM a.fecha))::double precision))));


ALTER VIEW public.vista_agua OWNER TO me;

--
-- Name: estadistica_agua; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.estadistica_agua AS
 SELECT fecha,
    sum(m3) AS m3,
    max(m3) AS max,
    min(m3) AS min,
    round(avg(m3), 2) AS avg,
    round(stddev_pop(m3), 2) AS stddev,
    sum(importe) AS importe,
    sum(domiciliado) AS domiciliado
   FROM public.vista_agua
  WHERE ((m3 > 0) AND (estado = ANY (ARRAY['R'::bpchar, 'C'::bpchar])))
  GROUP BY fecha;


ALTER VIEW public.estadistica_agua OWNER TO me;

--
-- Name: vista_cuotas; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.vista_cuotas AS
 SELECT c.id_parcela,
    s.titular,
    s.titular_cc_cuota AS titular_cc,
    s.cc_cuota AS cc,
    s.bic_cuota AS bic,
    s.iban_cuota AS iban,
    c.fecha,
    c.cuota,
    c.dto,
    c.domicilia_bco,
        CASE
            WHEN (c.domicilia_bco IS FALSE) THEN (0)::numeric
            ELSE round((c.cuota - ((c.cuota * c.dto) / (100)::numeric)), 2)
        END AS domiciliado,
    c.estado,
        CASE
            WHEN (c.estado = 'R'::bpchar) THEN '🟠'::text
            ELSE '🔴'::text
        END AS e,
    c.notas,
    s.fecha_mandato
   FROM (public.cuotas c
     JOIN public.socios s ON (((c.id_parcela)::text = (s.id_parcela)::text)))
  ORDER BY c.fecha DESC;


ALTER VIEW public.vista_cuotas OWNER TO me;

--
-- Name: estadistica_cuotas; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.estadistica_cuotas AS
 SELECT fecha,
    sum(cuota) AS cuota,
    sum(domiciliado) AS domiciliado,
    ( SELECT sum(cuotas.cuota) AS sum
           FROM public.cuotas
          WHERE ((cuotas.fecha = v.fecha) AND (NOT cuotas.domicilia_bco))) AS no_domiciliado
   FROM public.vista_cuotas v
  GROUP BY fecha
  ORDER BY fecha DESC;


ALTER VIEW public.estadistica_cuotas OWNER TO me;

--
-- Name: riego; Type: TABLE; Schema: public; Owner: me
--

CREATE TABLE public.riego (
    id_contador integer NOT NULL,
    fecha date NOT NULL,
    l1 integer,
    l2 integer,
    m3 integer,
    averiado boolean,
    notas text,
    estado character(1) DEFAULT 'A'::bpchar,
    CONSTRAINT riego_chk CHECK ((estado = ANY (ARRAY['A'::bpchar, 'R'::bpchar, 'C'::bpchar])))
);


ALTER TABLE public.riego OWNER TO me;

--
-- Name: estadistica_riego; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.estadistica_riego AS
 SELECT fecha,
    sum(m3) AS m3,
    max(m3) AS max,
    min(m3) AS min,
    round(avg(m3), 2) AS avg
   FROM public.riego
  GROUP BY fecha;


ALTER VIEW public.estadistica_riego OWNER TO me;

--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: me
--

CREATE SEQUENCE public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.events_id_seq OWNER TO me;

--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: me
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: extrahours; Type: TABLE; Schema: public; Owner: me
--

CREATE TABLE public.extrahours (
    user_id integer,
    starts_at timestamp without time zone,
    ends_at timestamp without time zone
);


ALTER TABLE public.extrahours OWNER TO me;

--
-- Name: geoloc; Type: TABLE; Schema: public; Owner: me
--

CREATE TABLE public.geoloc (
    id_user integer NOT NULL,
    momento timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    lugar point,
    direccion numeric(5,2),
    locatedat timestamp with time zone
);


ALTER TABLE public.geoloc OWNER TO me;

--
-- Name: holidays; Type: TABLE; Schema: public; Owner: me
--

CREATE TABLE public.holidays (
    user_id integer,
    fecha_inicio date,
    fecha_fin date,
    title text,
    class text
);


ALTER TABLE public.holidays OWNER TO me;

--
-- Name: properties; Type: TABLE; Schema: public; Owner: me
--

CREATE TABLE public.properties (
    id_presentador character varying(16),
    nombre_presentador character varying(70),
    id_acreedor character varying(16),
    nombre_acreedor character varying(70),
    iban_acreedor character(24),
    ref_identificativa character varying(13),
    entidad_receptora character(4),
    oficina_receptora character(4),
    iva_agua integer
);


ALTER TABLE public.properties OWNER TO me;

--
-- Name: publicholidays; Type: TABLE; Schema: public; Owner: me
--

CREATE TABLE public.publicholidays (
    fecha date,
    title text
);


ALTER TABLE public.publicholidays OWNER TO me;

--
-- Name: remesa_agua; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.remesa_agua AS
 SELECT a.fecha,
    a.id_parcela,
    s.titular,
    s.titular_cc_agua AS titular_cc,
    s.bic_agua AS bic,
    s.iban_agua AS iban,
    a.l1,
    a.l2,
    a.m3,
    a.pm3,
    a.t1,
    a.t2,
    a.f_a,
    a.f_b,
    a.f_c,
    a.domicilia_bco,
        CASE
            WHEN (a.domicilia_bco IS FALSE) THEN (0)::numeric
            ELSE round(public.calcula_tramos((a.m3)::numeric, a.t1, a.t2, a.pm3, a.f_a, a.f_b, a.f_c), 2)
        END AS domiciliado,
    a.averiado,
    a.notas,
    a.estado,
    a.ult_modif,
    a.user_modif,
    a.inactivo
   FROM (public.agua a
     JOIN public.socios s ON (((s.id_parcela)::text = (a.id_parcela)::text)))
  WHERE ((a.fecha = ( SELECT max(agua.fecha) AS max
           FROM public.agua)) AND (a.estado <> 'A'::bpchar) AND (a.inactivo = false))
  ORDER BY a.id_parcela;


ALTER VIEW public.remesa_agua OWNER TO me;

--
-- Name: remesa_agua_residente; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.remesa_agua_residente AS
 SELECT a.fecha,
    a.id_parcela,
    s.titular,
    s.titular_cc_agua AS titular_cc,
    s.bic_agua AS bic,
    s.iban_agua AS iban,
    a.l1,
    a.l2,
    a.m3,
    a.pm3,
    a.t1,
    a.t2,
    a.f_a,
    a.f_b,
    a.f_c,
    a.domicilia_bco,
        CASE
            WHEN (a.domicilia_bco IS FALSE) THEN (0)::numeric
            ELSE round(public.calcula_tramos((a.m3)::numeric, a.t1, a.t2, a.pm3, a.f_a, a.f_b, a.f_c), 2)
        END AS domiciliado,
    a.averiado,
    a.notas,
    a.estado,
    a.ult_modif,
    a.user_modif,
    a.inactivo
   FROM (public.agua a
     JOIN public.socios s ON (((s.id_parcela)::text = (a.id_parcela)::text)))
  WHERE ((a.fecha = ( SELECT max(agua.fecha) AS max
           FROM public.agua)) AND (a.inactivo = false))
  ORDER BY a.id_parcela;


ALTER VIEW public.remesa_agua_residente OWNER TO me;

--
-- Name: remesas_especiales_seq; Type: SEQUENCE; Schema: public; Owner: me
--

CREATE SEQUENCE public.remesas_especiales_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.remesas_especiales_seq OWNER TO me;

--
-- Name: remesas_especiales; Type: TABLE; Schema: public; Owner: me
--

CREATE TABLE public.remesas_especiales (
    id_parcela character varying(12) NOT NULL,
    titular character varying(80) NOT NULL,
    bic character varying(11) NOT NULL,
    iban character(24) NOT NULL,
    importe numeric(6,2) NOT NULL,
    concepto character varying(140) NOT NULL,
    id_remesa integer DEFAULT nextval('public.remesas_especiales_seq'::regclass) NOT NULL,
    fecha_mandato date
);


ALTER TABLE public.remesas_especiales OWNER TO me;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: me
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO me;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: me
--

CREATE TABLE public.roles (
    id integer DEFAULT nextval('public.roles_id_seq'::regclass) NOT NULL,
    role character varying(80) NOT NULL
);


ALTER TABLE public.roles OWNER TO me;

--
-- Name: ruta_lectura; Type: TABLE; Schema: public; Owner: me
--

CREATE TABLE public.ruta_lectura (
    orden integer,
    id_parcela character(3) NOT NULL
);


ALTER TABLE public.ruta_lectura OWNER TO me;

--
-- Name: suministro; Type: TABLE; Schema: public; Owner: me
--

CREATE TABLE public.suministro (
    id_contador integer NOT NULL,
    fecha date NOT NULL,
    l1 integer,
    l2 integer,
    m3 integer,
    averiado boolean,
    notas text,
    estado character(1) DEFAULT 'A'::bpchar,
    CONSTRAINT suministro_chk CHECK ((estado = ANY (ARRAY['A'::bpchar, 'R'::bpchar, 'C'::bpchar])))
);


ALTER TABLE public.suministro OWNER TO me;

--
-- Name: user_role; Type: TABLE; Schema: public; Owner: me
--

CREATE TABLE public.user_role (
    id_user integer,
    id_role integer
);


ALTER TABLE public.user_role OWNER TO me;

--
-- Name: user_socio; Type: TABLE; Schema: public; Owner: me
--

CREATE TABLE public.user_socio (
    id_user integer NOT NULL,
    id_parcela character varying(4) NOT NULL
);


ALTER TABLE public.user_socio OWNER TO me;

--
-- Name: users; Type: TABLE; Schema: public; Owner: me
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(80),
    email character varying(80),
    passwd character varying(80),
    token text,
    roles text[],
    last_login timestamp with time zone
);


ALTER TABLE public.users OWNER TO me;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: me
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO me;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: me
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vista_consumo; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.vista_consumo AS
 SELECT a.id_parcela,
    a.fecha,
    a.m3,
    e.avg
   FROM (public.agua a
     JOIN public.estadistica_agua e ON ((a.fecha = e.fecha)))
  WHERE (a.m3 IS NOT NULL)
  ORDER BY a.fecha;


ALTER VIEW public.vista_consumo OWNER TO me;

--
-- Name: vista_extrahours; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.vista_extrahours AS
 SELECT e.user_id,
    e.starts_at,
    e.ends_at,
    (e.ends_at - e.starts_at) AS duration,
    initcap(split_part((u.name)::text, ' '::text, 1)) AS title,
    'extraHours'::text AS class
   FROM (public.extrahours e
     JOIN public.users u ON ((e.user_id = u.id)));


ALTER VIEW public.vista_extrahours OWNER TO me;

--
-- Name: vista_extrahours_scheduled; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.vista_extrahours_scheduled AS
 SELECT e.user_id,
    to_char(e.starts_at, 'DD-MM-YYYY'::text) AS fecha,
    public.dow2es(e.starts_at) AS dia,
    initcap(split_part((u.name)::text, ' '::text, 1)) AS empleado,
    e.starts_at AS inicia,
    e.ends_at AS termina,
    (e.ends_at - e.starts_at) AS duracion,
    'extra'::text AS tipo
   FROM (public.extrahours e
     JOIN public.users u ON ((u.id = e.user_id)));


ALTER VIEW public.vista_extrahours_scheduled OWNER TO me;

--
-- Name: vista_lectura; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.vista_lectura AS
 SELECT r.orden,
    r.id_parcela,
    a.titular,
    a.fecha,
    a.estado,
    a.l1,
    a.l2,
    a.m3,
    a.avg,
    a.stddev,
    a.averiado,
    a.notas,
    a.e,
        CASE
            WHEN ((a.m3)::numeric > (a.avg + a.stddev)) THEN '🔺'::text
            WHEN ((a.m3)::numeric < (a.avg - a.stddev)) THEN '🔻'::text
            ELSE '🔹'::text
        END AS c,
    a.domicilia_bco,
    a.inactivo,
    a.importe
   FROM (public.ruta_lectura r
     JOIN public.vista_agua a ON (((r.id_parcela = (a.id_parcela)::bpchar) AND (a.fecha = ( SELECT max(agua.fecha) AS max
           FROM public.agua)))));


ALTER VIEW public.vista_lectura OWNER TO me;

--
-- Name: vista_remesa_agua_sepa; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.vista_remesa_agua_sepa AS
 SELECT a.fecha,
    a.id_parcela,
    s.titular_cc_agua AS titular,
    s.bic_agua AS bic,
    s.iban_agua AS iban,
    s.fecha_mandato,
        CASE
            WHEN (a.domicilia_bco IS FALSE) THEN (0)::numeric
            ELSE round(public.calcula_tramos((a.m3)::numeric, a.t1, a.t2, a.pm3, a.f_a, a.f_b, a.f_c), 2)
        END AS importe,
    ( SELECT detalla_tramos.v_resumen
           FROM public.detalla_tramos(a.id_parcela, (a.l1)::numeric, (a.l2)::numeric, (a.m3)::numeric, a.t1, a.t2, a.pm3, a.f_a, a.f_b, a.f_c) detalla_tramos(v_id_parcela, v_m3, v_t1, v_t2, v_pvp_m3, v_f_a, v_f_b, v_f_c, v_m3_a, v_m3_b, v_m3_c, v_p_m3_a, v_p_m3_b, v_p_m3_c, v_resultado, v_resumen)) AS concepto
   FROM (public.agua a
     JOIN public.socios s ON (((s.id_parcela)::text = (a.id_parcela)::text)))
  WHERE ((a.fecha = ( SELECT max(agua.fecha) AS max
           FROM public.agua)) AND (a.estado = 'R'::bpchar) AND (a.m3 >= 10) AND a.domicilia_bco);


ALTER VIEW public.vista_remesa_agua_sepa OWNER TO me;

--
-- Name: vista_riego; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.vista_riego AS
 SELECT a.id_contador,
    c.lugar,
    a.fecha,
    a.l1,
    a.l2,
    a.m3,
    a.averiado,
    a.notas,
    a.estado,
        CASE
            WHEN (a.estado = 'A'::bpchar) THEN '🟢'::text
            WHEN (a.estado = 'R'::bpchar) THEN '🟠'::text
            ELSE '🔴'::text
        END AS e
   FROM (public.riego a
     JOIN public.contadores_riego c ON (((a.id_contador = c.id_contador) AND (a.fecha = ( SELECT max(riego.fecha) AS max
           FROM public.riego)))));


ALTER VIEW public.vista_riego OWNER TO me;

--
-- Name: vista_socios_bank; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.vista_socios_bank AS
 SELECT id_parcela,
    titular_cc_cuota,
    bic_cuota,
    iban_cuota,
    titular_cc_agua,
    bic_agua,
    iban_agua,
    fecha_mandato,
    nif_titular_cc_agua
   FROM public.socios s;


ALTER VIEW public.vista_socios_bank OWNER TO me;

--
-- Name: vista_socios_contact; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.vista_socios_contact AS
 SELECT id_parcela,
    titular,
    email,
    domicilio,
    localidad,
    cp,
    telef1,
    telef2,
    telef3,
    email2,
    titular2,
    geolocation,
    notas,
    nif_titular_cc_agua,
    titular_cc_agua
   FROM public.socios s;


ALTER VIEW public.vista_socios_contact OWNER TO me;

--
-- Name: vista_suministro; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.vista_suministro AS
 SELECT a.id_contador,
    c.lugar,
    a.fecha,
    a.l1,
    a.l2,
    a.m3,
    a.averiado,
    a.notas,
    a.estado,
        CASE
            WHEN (a.estado = 'A'::bpchar) THEN '🟢'::text
            WHEN (a.estado = 'R'::bpchar) THEN '🟠'::text
            ELSE '🔴'::text
        END AS e
   FROM (public.suministro a
     JOIN public.contadores_suministro c ON (((a.id_contador = c.id_contador) AND (a.fecha = ( SELECT max(suministro.fecha) AS max
           FROM public.suministro)))));


ALTER VIEW public.vista_suministro OWNER TO me;

--
-- Name: vista_ult_fichaje_emp; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.vista_ult_fichaje_emp AS
 SELECT id_user,
    to_char(momento, 'DD-MM-YYYY HH24:MI'::text) AS momento_formateado,
    momento,
    accion,
    lugar
   FROM public.fichajes f1
  WHERE (momento IN ( SELECT max(f2.momento) AS max
           FROM public.fichajes f2
          WHERE (f1.id_user = f2.id_user)));


ALTER VIEW public.vista_ult_fichaje_emp OWNER TO me;

--
-- Name: vista_user_socio; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.vista_user_socio AS
 SELECT u.id,
    u.name,
    us.id_parcela,
    u.email,
    u.roles,
    u.passwd
   FROM (public.users u
     LEFT JOIN public.user_socio us ON ((u.id = us.id_user)));


ALTER VIEW public.vista_user_socio OWNER TO me;

--
-- Name: vista_user_socio_agua; Type: VIEW; Schema: public; Owner: me
--

CREATE VIEW public.vista_user_socio_agua AS
 SELECT u.id,
    u.name,
    u.email,
    s.id_parcela
   FROM (public.users u
     JOIN public.user_socio s ON (((u.id = s.id_user) AND ((s.id_parcela)::text IN ( SELECT DISTINCT agua.id_parcela
           FROM public.agua)))));


ALTER VIEW public.vista_user_socio_agua OWNER TO me;

--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: cuotas cuota_pk; Type: CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.cuotas
    ADD CONSTRAINT cuota_pk PRIMARY KEY (id_parcela, fecha);


--
-- Name: users email_unique; Type: CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT email_unique UNIQUE (email);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: agua fac_agua_pk; Type: CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.agua
    ADD CONSTRAINT fac_agua_pk PRIMARY KEY (id_parcela, fecha);


--
-- Name: fichajes fichajes_pk; Type: CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.fichajes
    ADD CONSTRAINT fichajes_pk PRIMARY KEY (id_user, momento);


--
-- Name: geoloc geoloc_pk; Type: CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.geoloc
    ADD CONSTRAINT geoloc_pk PRIMARY KEY (id_user, momento);


--
-- Name: remesas_especiales remesas_especiales_pk; Type: CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.remesas_especiales
    ADD CONSTRAINT remesas_especiales_pk PRIMARY KEY (id_remesa);


--
-- Name: riego riego_pk; Type: CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.riego
    ADD CONSTRAINT riego_pk PRIMARY KEY (id_contador, fecha);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: ruta_lectura ruta_lectura_pk; Type: CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.ruta_lectura
    ADD CONSTRAINT ruta_lectura_pk PRIMARY KEY (id_parcela);


--
-- Name: socios socios_pkey; Type: CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.socios
    ADD CONSTRAINT socios_pkey PRIMARY KEY (id_parcela);


--
-- Name: suministro suministro_pk; Type: CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.suministro
    ADD CONSTRAINT suministro_pk PRIMARY KEY (id_contador, fecha);


--
-- Name: contadores_suministro suministro_pkey; Type: CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.contadores_suministro
    ADD CONSTRAINT suministro_pkey PRIMARY KEY (id_contador);


--
-- Name: contadores_riego ubicacion_riego_pkey; Type: CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.contadores_riego
    ADD CONSTRAINT ubicacion_riego_pkey PRIMARY KEY (id_contador);


--
-- Name: user_socio user_socio_pk; Type: CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.user_socio
    ADD CONSTRAINT user_socio_pk PRIMARY KEY (id_user, id_parcela);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: agua agua_socios_fk; Type: FK CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.agua
    ADD CONSTRAINT agua_socios_fk FOREIGN KEY (id_parcela) REFERENCES public.socios(id_parcela) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: cuotas cuota_socios_fk; Type: FK CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.cuotas
    ADD CONSTRAINT cuota_socios_fk FOREIGN KEY (id_parcela) REFERENCES public.socios(id_parcela) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: fichajes fichajes_fk; Type: FK CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.fichajes
    ADD CONSTRAINT fichajes_fk FOREIGN KEY (id_user) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: geoloc geoloc_fk; Type: FK CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.geoloc
    ADD CONSTRAINT geoloc_fk FOREIGN KEY (id_user) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_role id_role_fk; Type: FK CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.user_role
    ADD CONSTRAINT id_role_fk FOREIGN KEY (id_role) REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_role id_user_fk; Type: FK CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.user_role
    ADD CONSTRAINT id_user_fk FOREIGN KEY (id_user) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: riego riego_contadores_fk; Type: FK CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.riego
    ADD CONSTRAINT riego_contadores_fk FOREIGN KEY (id_contador) REFERENCES public.contadores_riego(id_contador) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_socio user_socio_socios_pk; Type: FK CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.user_socio
    ADD CONSTRAINT user_socio_socios_pk FOREIGN KEY (id_parcela) REFERENCES public.socios(id_parcela) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: user_socio user_socio_users_pk; Type: FK CONSTRAINT; Schema: public; Owner: me
--

ALTER TABLE ONLY public.user_socio
    ADD CONSTRAINT user_socio_users_pk FOREIGN KEY (id_user) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

