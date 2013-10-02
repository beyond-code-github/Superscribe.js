namespace Demo
{
    using System;
    using System.IO;

    using Superscribe.Models;
    using Superscribe.Owin;

    public class HtmlModule : SuperscribeOwinModule
    {
        public HtmlModule()
        {
            this.Get["/"] = _ =>
                {
                    var directory = AppDomain.CurrentDomain.BaseDirectory;
                    return File.ReadAllText(directory + "/index.html");
                };
        }
    }
}