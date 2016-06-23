/*
 * Copyright Blue Jeans Network.
 */
package com.bluejeans.jin;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;

/**
 * Servlet context listener for Invoker service.
 *
 * @author Dinesh Ilindra
 */
public class InvokerServletListener implements ServletContextListener {

    private final InvokerService service = new InvokerService();

    /*
     * (non-Javadoc)
     *
     * @see
     * javax.servlet.ServletContextListener#contextInitialized(javax.servlet
     * .ServletContextEvent)
     */
    @Override
    public void contextInitialized(final ServletContextEvent sce) {
        service.getInvoker().setTarget("servletContext", sce.getServletContext());
        service.start();
    }

    /*
     * (non-Javadoc)
     *
     * @see javax.servlet.ServletContextListener#contextDestroyed(javax.servlet.
     * ServletContextEvent)
     */
    @Override
    public void contextDestroyed(final ServletContextEvent sce) {
        service.stop();
    }

}
