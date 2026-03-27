-- CHECK USER STATUS
SELECT 
    id, 
    email, 
    email_confirmed_at, 
    confirmed_at, 
    last_sign_in_at, 
    raw_user_meta_data,
    aud,
    role
FROM auth.users 
WHERE email = 'noe@envirojim.com';
