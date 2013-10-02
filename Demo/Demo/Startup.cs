namespace Demo
{
    using Owin;

    using Superscribe.Owin;

    public class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            var config = new SuperscribeOwinConfig();
            config.MediaTypeHandlers.Add(
                "text/html",
                new MediaTypeHandler { Write = (res, o) => res.WriteAsync(o.ToString()) });

            app.UseSuperscribeModules(config);
        }
    }
}