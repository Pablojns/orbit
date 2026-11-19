-- A função que cria o perfil no cadastro não deve ser chamada pela API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
