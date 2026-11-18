-- Records a bump & adds it to its counter in one statement each, so two
-- calls at once never lose one.
CREATE FUNCTION bump(counter text, step bigint DEFAULT 1) RETURNS bigint
LANGUAGE plpgsql AS $$
DECLARE
	result bigint;
BEGIN
	INSERT INTO bumps (name, amount) VALUES (counter, step);

	INSERT INTO counters AS c (name, value)
	VALUES (counter, step)
	ON CONFLICT (name) DO UPDATE SET value = c.value + step
	RETURNING value INTO result;

	RETURN result;
END
$$;
