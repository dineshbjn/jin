package com.bluejeans.jin;

import java.io.IOException;

import javax.annotation.PostConstruct;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import org.apache.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Path("/")
@Service
public class InvokerController {

    private static final Logger logger = Logger.getLogger(InvokerController.class);

    @Value("${invoker.title:" + InvokerSpringBean.INVOKER_TITLE + "}")
    private String invokerTitle;

    @Autowired
    private InvokerSpringBean invokerBean;

    @PostConstruct
    public void init() {
        invokerBean.setTitle(invokerTitle);
    }

    @GET
    @Path("/invoker/main")
    @Produces(MediaType.TEXT_HTML)
    public Response invokerMain() throws IOException {
        return invokerApi("/main");
    }

    @GET
    @Path("/invoker/do/{bean}/{data}")
    @Produces(MediaType.TEXT_PLAIN)
    public Response invokerMethod(@PathParam("bean") final String bean, @PathParam("data") final String data)
            throws IOException {
        return invokerApi("/do/" + bean + "/" + data);
    }

    public Response invokerApi(final String requestUri) throws IOException {
        logger.debug("processing invoker uri - " + requestUri);
        return Response.status(200).entity(invokerBean.getService().getNettyServerRef().getChannelInitializer()
                .getHandler().processRequest(invokerBean.getContextPrefix() + requestUri).getValue()).build();
    }

}
