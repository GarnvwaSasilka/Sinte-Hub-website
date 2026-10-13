import LoginForm from './LoginForm';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="container" style={{ maxWidth: 420, paddingTop: 48 }}>
      <div className="center">
        <img src="/logo-on-light.png" alt="Sinte's Hub" width={220} height={155} style={{ margin: '0 auto' }} />
        <h1 style={{ fontSize: '1.6rem' }}>Owner login</h1>
      </div>
      <LoginForm notAdmin={error === 'not-admin'} />
    </div>
  );
}
