/*
 * Copyright Blue Jeans Network.
 */
package com.bluejeans.jin;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;

import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

/**
 * Spring bean to start invoker service with application context as target.
 *
 * @author Dinesh Ilindra
 */
@Component
public class InvokerSpringBean implements ApplicationContextAware {

	private final InvokerService service;

	private ApplicationContext context;

	private String contextPrefix = "";

	private String title = "Java Interpreter";

	/**
	 * The default one
	 */
	public InvokerSpringBean() {
		service = new InvokerService();
		service.getInvoker().setTarget("spring", this);
	}

	/**
	 * With port and targets
	 *
	 * @param port
	 *            the port to use
	 * @param targets
	 *            the targets
	 */
	public InvokerSpringBean(final int port, final Object... targets) {
		service = new InvokerService(port, targets);
		service.getInvoker().setTarget("spring", this);
	}

	/**
	 * @return the service
	 */
	public InvokerService getService() {
		return service;
	}

	/**
	 * @return the context
	 */
	public ApplicationContext getContext() {
		return context;
	}

	/*
	 * (non-Javadoc)
	 *
	 * @see
	 * org.springframework.context.ApplicationContextAware#setApplicationContext
	 * (org.springframework.context.ApplicationContext)
	 */
	@Override
	public void setApplicationContext(final ApplicationContext context) throws BeansException {
		this.context = context;
	}

	/**
	 * Initialize.
	 */
	@PostConstruct
	public void init() {
		try {
			service.start(contextPrefix);
		} catch (final Exception ex) {
			// do nothing.
		}
	}

	/**
	 * Destroy
	 */
	@PreDestroy
	public void destroy() {
		try {
			service.stop();
		} catch (final Exception ex) {
			// do nothing.
		}
	}

	/**
	 * @return the contextPrefix
	 */
	public String getContextPrefix() {
		return contextPrefix;
	}

	/**
	 * @param contextPrefix
	 *            the contextPrefix to set
	 */
	public void setContextPrefix(final String contextPrefix) {
		this.contextPrefix = contextPrefix;
	}

	/**
	 * @return the title
	 */
	public String getTitle() {
		return title;
	}

	/**
	 * @param title
	 *            the title to set
	 */
	public void setTitle(final String title) {
		this.title = title;
	}

	/**
	 * @return
	 * @see com.bluejeans.jin.InvokerService#getExtjsResourcePrefix()
	 */
	public String getExtjsResourcePrefix() {
		return service.getExtjsResourcePrefix();
	}

	/**
	 * @param extjsResourcePrefix
	 * @see com.bluejeans.jin.InvokerService#setExtjsResourcePrefix(java.lang.String)
	 */
	public void setExtjsResourcePrefix(final String extjsResourcePrefix) {
		service.setExtjsResourcePrefix(extjsResourcePrefix);
	}

	/**
	 * @return
	 * @see com.bluejeans.jin.InvokerService#getInvokerjsResourcePrefix()
	 */
	public String getInvokerjsResourcePrefix() {
		return service.getInvokerjsResourcePrefix();
	}

	/**
	 * @param invokerjsResourcePrefix
	 * @see com.bluejeans.jin.InvokerService#setInvokerjsResourcePrefix(java.lang.String)
	 */
	public void setInvokerjsResourcePrefix(final String invokerjsResourcePrefix) {
		service.setInvokerjsResourcePrefix(invokerjsResourcePrefix);
	}

	/**
	 * @return
	 * @see com.bluejeans.jin.InvokerService#isLocaclJsEnabled()
	 */
	public boolean isLocaclJsEnabled() {
		return service.isLocaclJsEnabled();
	}

	/**
	 * @param locaclJsEnabled
	 * @see com.bluejeans.jin.InvokerService#setLocaclJsEnabled(boolean)
	 */
	public void setLocaclJsEnabled(boolean locaclJsEnabled) {
		service.setLocaclJsEnabled(locaclJsEnabled);
	}

}
