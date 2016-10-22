package com.bluejeans.controller;

import java.io.IOException;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import org.springframework.stereotype.Service;

@Path("/")
@Service
public class InvokerControllerPlus extends InvokerController {

    @GET
    @Path("/invoker/_main")
    @Produces(MediaType.TEXT_HTML)
    public Response invokerMainLocal() throws IOException {
        return invokerApi("/_main");
    }

    @GET
    @Path("/invoker/run/{data}")
    @Produces(MediaType.TEXT_PLAIN)
    public Response invokerRun(@PathParam("data") final String data) throws IOException {
        return invokerApi("/run/" + data);
    }

    @GET
    @Path("/invoker/value/{bean}/{data}")
    @Produces(MediaType.TEXT_PLAIN)
    public Response invokerValue(@PathParam("bean") final String bean, @PathParam("data") final String data)
            throws IOException {
        return invokerApi("/value/" + bean + "/" + data);
    }

    @GET
    @Path("/invoker/static/{folder1}")
    @Produces(MediaType.TEXT_PLAIN)
    public Response invokerStaticFolder(@PathParam("folder1") final String folder1) throws IOException {
        return invokerApi("/static/" + folder1);
    }

    @GET
    @Path("/invoker/static/{folder1}/{folder2}")
    @Produces(MediaType.TEXT_PLAIN)
    public Response invokerStaticFolder1(@PathParam("folder1") final String folder1,
            @PathParam("folder2") final String resource) throws IOException {
        return invokerApi("/static/" + folder1 + "/" + resource);
    }

    @GET
    @Path("/invoker/static/{folder1}/{folder2}/{folder3}")
    @Produces(MediaType.TEXT_PLAIN)
    public Response invokerStaticFolder2(@PathParam("folder1") final String folder1,
            @PathParam("folder2") final String folder2, @PathParam("folder3") final String resource)
            throws IOException {
        return invokerApi("/static/" + folder1 + "/" + folder2 + "/" + resource);
    }

    @GET
    @Path("/invoker/static/{folder1}/{folder2}/{folder3}/{folder4}")
    @Produces(MediaType.TEXT_PLAIN)
    public Response invokerStaticFolder3(@PathParam("folder1") final String folder1,
            @PathParam("folder2") final String folder2, @PathParam("folder3") final String folder3,
            @PathParam("folder4") final String resource) throws IOException {
        return invokerApi("/static/" + folder1 + "/" + folder2 + "/" + folder3 + "/" + resource);
    }

    @GET
    @Path("/invoker/static/{folder1}/{folder2}/{folder3}/{folder4}/{folder5}")
    @Produces(MediaType.TEXT_PLAIN)
    public Response invokerStaticFolder4(@PathParam("folder1") final String folder1,
            @PathParam("folder2") final String folder2, @PathParam("folder3") final String folder3,
            @PathParam("folder4") final String folder4, @PathParam("folder5") final String resource)
            throws IOException {
        return invokerApi("/static/" + folder1 + "/" + folder2 + "/" + folder3 + "/" + folder4 + "/" + resource);
    }

    @GET
    @Path("/invoker/static/{folder1}/{folder2}/{folder3}/{folder4}/{folder5}/{folder6}")
    @Produces(MediaType.TEXT_PLAIN)
    public Response invokerStaticFolder5(@PathParam("folder1") final String folder1,
            @PathParam("folder2") final String folder2, @PathParam("folder3") final String folder3,
            @PathParam("folder4") final String folder4, @PathParam("folder5") final String folder5,
            @PathParam("folder6") final String resource) throws IOException {
        return invokerApi(
                "/static/" + folder1 + "/" + folder2 + "/" + folder3 + "/" + folder4 + "/" + folder5 + "/" + resource);
    }

    @GET
    @Path("/invoker/static/{folder1}/{folder2}/{folder3}/{folder4}/{folder5}/{folder6}/{resource}")
    @Produces(MediaType.TEXT_PLAIN)
    public Response invokerStaticFolder6(@PathParam("folder1") final String folder1,
            @PathParam("folder2") final String folder2, @PathParam("folder3") final String folder3,
            @PathParam("folder4") final String folder4, @PathParam("folder5") final String folder5,
            @PathParam("folder6") final String folder6, @PathParam("resource") final String resource)
            throws IOException {
        return invokerApi("/static/" + folder1 + "/" + folder2 + "/" + folder3 + "/" + folder4 + "/" + folder5 + "/"
                + folder6 + "/" + resource);
    }

}
