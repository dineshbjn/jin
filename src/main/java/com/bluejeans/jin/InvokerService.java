/*
 * Copyright Blue Jeans Network.
 */
package com.bluejeans.jin;

import fi.iki.elonen.SimpleWebServer;
import io.netty.bootstrap.ServerBootstrap;
import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelFutureListener;
import io.netty.channel.ChannelHandler.Sharable;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.EventLoopGroup;
import io.netty.channel.ServerChannel;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;
import io.netty.handler.codec.http.DefaultFullHttpResponse;
import io.netty.handler.codec.http.FullHttpRequest;
import io.netty.handler.codec.http.FullHttpResponse;
import io.netty.handler.codec.http.HttpMethod;
import io.netty.handler.codec.http.HttpObjectAggregator;
import io.netty.handler.codec.http.HttpRequestDecoder;
import io.netty.handler.codec.http.HttpResponseEncoder;
import io.netty.handler.codec.http.HttpResponseStatus;
import io.netty.handler.codec.http.HttpVersion;
import io.netty.util.CharsetUtil;

import java.io.File;
import java.io.IOException;
import java.io.Writer;
import java.net.URLDecoder;
import java.nio.charset.Charset;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import com.bluejeans.utils.MetaUtil;
import com.bluejeans.utils.URIInvoker;
import com.google.gson.Gson;

/**
 * Invoker Service
 *
 * @author Dinesh Ilindra
 */
public class InvokerService {

	/**
	 * Info buffer.
	 *
	 * @author Dinesh Ilindra
	 */
	public static class InvokerInfoBuffer extends Writer implements Cloneable {

		/**
		 * The minimum capacity of the buffer.
		 */
		public static final int MIN_CAPACITY = Short.MAX_VALUE;

		/**
		 * The maximum capacity of the buffer.
		 */
		public static final int MAX_CAPACITY = 1024 * 1024;

		/**
		 * The append chunk size.
		 */
		public static final int CHUNK_LENGTH = Byte.MAX_VALUE;

		private static final byte[] nullBytes = "[null]".getBytes(CharsetUtil.UTF_8);

		private final ByteBuf byteBuf;

		private final Charset charset;

		private final int maxCapacity;

		/**
		 * Creates default info buffer with unpooled heap buffer and UTF8
		 * charset.
		 */
		public InvokerInfoBuffer() {
			this(Unpooled.buffer(InvokerInfoBuffer.MIN_CAPACITY, InvokerInfoBuffer.MAX_CAPACITY), CharsetUtil.UTF_8);
		}

		/**
		 * Creates default info buffer with unpooled heap buffer and UTF8
		 * charset.
		 *
		 * @param maxCapacity
		 *            the maximum capacity
		 */
		public InvokerInfoBuffer(final int maxCapacity) {
			this(Unpooled.buffer(InvokerInfoBuffer.MIN_CAPACITY, maxCapacity), CharsetUtil.UTF_8);
		}

		/**
		 * @param byteBuf
		 *            the byte buffer
		 * @param charset
		 *            the charset
		 */
		public InvokerInfoBuffer(final ByteBuf byteBuf, final Charset charset) {
			this.byteBuf = byteBuf;
			this.charset = charset;
			maxCapacity = byteBuf.capacity();
		}

		/**
		 * @return the byteBuf
		 */
		public ByteBuf getByteBuf() {
			return byteBuf;
		}

		/**
		 * @return the charset
		 */
		public Charset getCharset() {
			return charset;
		}

		/**
		 * @return the maxCapacity
		 */
		public int getMaxCapacity() {
			return maxCapacity;
		}

		/**
		 * The string value of the byte buf.
		 *
		 * @return the value
		 */
		public String getValue() {
			return byteBuf.toString(charset);
		}

		/**
		 * Returns true if and only if this string representation of the buffer
		 * contains the specified sequence of char values.
		 *
		 * @param sequence
		 *            the char sequence
		 * @return true if contains
		 * @see String#contains(CharSequence)
		 */
		public boolean contains(final CharSequence sequence) {
			return getValue().contains(sequence);
		}

		/**
		 * Transfers the specified strings byte data, based on the charset, to
		 * the buffer starting at the current writerIndex and increases the
		 * writerIndex by the number of the transferred bytes (= bytes.length).
		 *
		 * @param str
		 *            the string
		 * @return this byte buffer
		 * @see ByteBuf#writeBytes(byte[])
		 */
		public ByteBuf append(final String str) {
			if (str == null) {
				byteBuf.writeBytes(InvokerInfoBuffer.nullBytes);
			} else {
				String chunk = null;
				final int len = str.length();
				try {
					for (int index = 0; index < len / InvokerInfoBuffer.CHUNK_LENGTH; index++) {
						chunk = str.substring(index * InvokerInfoBuffer.CHUNK_LENGTH,
								(index + 1) * InvokerInfoBuffer.CHUNK_LENGTH);
						byteBuf.writeBytes(chunk.getBytes(charset));
					}
					byteBuf.writeBytes(
							str.substring(len - len % InvokerInfoBuffer.CHUNK_LENGTH, len).getBytes(charset));
				} catch (final IndexOutOfBoundsException iobe) {
					// do nothing.
				}
			}
			return byteBuf;
		}

		/**
		 * Appends the given value as a string to the buffer. The argument is
		 * converted to a string as if by the method String.valueOf, and the
		 * characters of that string are then appended to the buffer.
		 *
		 * @param booleanValue
		 *            the boolean value
		 * @return this byte buffer
		 */
		public ByteBuf append(final boolean booleanValue) {
			return append(String.valueOf(booleanValue));
		}

		/**
		 * Appends the given value as a string to the buffer. The argument is
		 * converted to a string as if by the method String.valueOf, and the
		 * characters of that string are then appended to the buffer.
		 *
		 * @param intValue
		 *            the int value
		 * @return this byte buffer
		 */
		public ByteBuf append(final int intValue) {
			return append(String.valueOf(intValue));
		}

		/**
		 * Appends the given value as a string to the buffer. The argument is
		 * converted to a string as if by the method String.valueOf, and the
		 * characters of that string are then appended to the buffer.
		 *
		 * @param longValue
		 *            the long value
		 * @return this byte buffer
		 */
		public ByteBuf append(final long longValue) {
			return append(String.valueOf(longValue));
		}

		/**
		 * Appends the given value as a string to the buffer. The argument is
		 * converted to a string as if by the method String.valueOf, and the
		 * characters of that string are then appended to the buffer.
		 *
		 * @param obj
		 *            the object
		 * @return this byte buffer
		 */
		public ByteBuf append(final Object obj) {
			return append(String.valueOf(obj));
		}

		/*
		 * (non-Javadoc)
		 *
		 * @see java.io.Writer#append(java.lang.CharSequence)
		 */
		@Override
		public Writer append(final CharSequence csq) throws IOException {
			append(String.valueOf(csq));
			return this;
		}

		/*
		 * (non-Javadoc)
		 *
		 * @see java.io.Writer#append(java.lang.CharSequence, int, int)
		 */
		@Override
		public Writer append(final CharSequence csq, final int start, final int end) throws IOException {
			return append(csq.subSequence(start, end));
		}

		/*
		 * (non-Javadoc)
		 *
		 * @see java.io.Writer#append(char)
		 */
		@Override
		public Writer append(final char ch) throws IOException {
			append(String.valueOf(ch));
			return this;
		}

		/*
		 * (non-Javadoc)
		 *
		 * @see java.io.Writer#write(char[], int, int)
		 */
		@Override
		public void write(final char[] cbuf, final int off, final int len) throws IOException {
			String chunk = null;
			try {
				for (int index = 0; index < len / InvokerInfoBuffer.CHUNK_LENGTH; index++) {
					chunk = new String(cbuf, off + index * InvokerInfoBuffer.CHUNK_LENGTH,
							InvokerInfoBuffer.CHUNK_LENGTH);
					byteBuf.writeBytes(chunk.getBytes(charset));
				}
				byteBuf.writeBytes(new String(cbuf, len - off - (len - off) % InvokerInfoBuffer.CHUNK_LENGTH,
						len % InvokerInfoBuffer.CHUNK_LENGTH).getBytes(charset));
			} catch (final IndexOutOfBoundsException iobe) {
				// do nothing.
			}
		}

		/**
		 * Appends a String and return this object.
		 *
		 * @param str
		 *            the string
		 * @return this buffer
		 */
		public InvokerInfoBuffer appendString(final String str) {
			append(str);
			return this;
		}

		/*
		 * (non-Javadoc)
		 *
		 * @see java.io.Writer#flush()
		 */
		@Override
		public void flush() throws IOException {
			// Do nothing.
		}

		/*
		 * (non-Javadoc)
		 *
		 * @see java.io.Writer#close()
		 */
		@Override
		public void close() throws IOException {
			byteBuf.release(byteBuf.refCnt());
		}

		/**
		 * Resets the indexes.
		 */
		public void reset() {
			byteBuf.clear();
		}

		/*
		 * (non-Javadoc)
		 *
		 * @see java.lang.Object#clone()
		 */
		@SuppressWarnings("resource")
		@Override
		protected InvokerInfoBuffer clone() {
			return new InvokerInfoBuffer().appendString(getValue());
		}

	}

	/**
	 * Netty Server reference.
	 *
	 * @author Dinesh Ilindra
	 * @param <T>
	 *            the channel initializer
	 */
	public static class NettyServerRef<T extends ChannelInitializer<SocketChannel>> {

		private final ServerBootstrap serverBootstrap;

		private final T channelInitializer;

		private final EventLoopGroup parentGroup;

		private final EventLoopGroup childGroup;

		private final Class<? extends ServerChannel> serverChannel;

		private int port;

		/**
		 * @param serverBootstrap
		 *            the server bootstrap
		 * @param channelInitializer
		 *            the channel initializer
		 * @param parentGroup
		 *            the parent group
		 * @param childGroup
		 *            the child group
		 * @param serverChannel
		 *            the server channel
		 */
		public NettyServerRef(final ServerBootstrap serverBootstrap, final T channelInitializer,
				final EventLoopGroup parentGroup, final EventLoopGroup childGroup,
				final Class<? extends ServerChannel> serverChannel) {
			this.serverBootstrap = serverBootstrap;
			this.channelInitializer = channelInitializer;
			this.parentGroup = parentGroup;
			this.childGroup = childGroup;
			this.serverChannel = serverChannel;
		}

		/**
		 * @return the serverBootstrap
		 */
		public ServerBootstrap getServerBootstrap() {
			return serverBootstrap;
		}

		/**
		 * @return the channelInitializer
		 */
		public T getChannelInitializer() {
			return channelInitializer;
		}

		/**
		 * @return the parentGroup
		 */
		public EventLoopGroup getParentGroup() {
			return parentGroup;
		}

		/**
		 * @return the childGroup
		 */
		public EventLoopGroup getChildGroup() {
			return childGroup;
		}

		/**
		 * Init only server bootstrap
		 */
		public void initServerBootstrap() {
			getServerBootstrap().group(getParentGroup(), getChildGroup()).childHandler(getChannelInitializer())
					.channel(serverChannel);
		}

		/**
		 * The port to bind to.
		 *
		 * @param port
		 *            the port
		 */
		public void initWithPort(final int port) {
			this.port = port;
			getServerBootstrap().localAddress(port);
		}

		/**
		 * Shutdown this server ref.
		 */
		public void shutdown() {
			parentGroup.shutdownGracefully(100, 100, TimeUnit.MILLISECONDS);
			childGroup.shutdownGracefully(100, 100, TimeUnit.MILLISECONDS);
		}

		/**
		 * @return the serverChannel
		 */
		public Class<? extends ServerChannel> getServerChannel() {
			return serverChannel;
		}

		/**
		 * @return the port
		 */
		public int getPort() {
			return port;
		}

	}

	/**
	 * Invoker server handler.
	 *
	 * @author Dinesh Ilindra
	 */
	@Sharable
	public class InvokerServerHttpHandler extends SimpleChannelInboundHandler<FullHttpRequest> {

		/**
		 * The values uri prefix.
		 */
		public static final String VALUE_PREFIX = "value";

		/**
		 * The method uri prefix.
		 */
		public static final String METHOD_PREFIX = "do";

		/**
		 * The run uri prefix.
		 */
		public static final String RUN_PREFIX = "run";

		/**
		 * The main uri prefix.
		 */
		public static final String MAIN_PREFIX = "main";

		/**
		 * The javascript resource prefix.
		 */
		public static final String JS_PREFIX = "js";

		/**
		 * The default buffer.
		 */
		public final InvokerInfoBuffer defaultBuffer = new InvokerInfoBuffer();

		/**
		 * The default buffer.
		 */
		public final InvokerInfoBuffer mainHtmlBuffer = new InvokerInfoBuffer();

		/**
		 * Process the given URI and return the info buffer for its response.
		 *
		 * @param request
		 *            the http request
		 * @return the response buffer
		 * @throws IOException
		 *             if decoding fails
		 */
		public InvokerInfoBuffer processRequest(final FullHttpRequest request) throws IOException {
			if (!request.getUri().startsWith(contextPrefix)) {
				return defaultBuffer;
			}
			final String[] uriSpec = request.getUri().substring(contextPrefix.length() + 1).split(SLASH, 3);
			InvokerInfoBuffer responseBuffer = null;
			if (uriSpec[0].equalsIgnoreCase(InvokerServerHttpHandler.VALUE_PREFIX)) {
				responseBuffer = new InvokerInfoBuffer();
				invoker.appendValue(responseBuffer, uriSpec[1], URLDecoder.decode(uriSpec[2], "UTF-8"), true);
			} else if (uriSpec[0].equalsIgnoreCase(InvokerServerHttpHandler.METHOD_PREFIX)) {
				responseBuffer = new InvokerInfoBuffer();
				invoker.appendValue(responseBuffer, uriSpec[1], URLDecoder.decode(uriSpec[2], "UTF-8"), false);
			} else if (uriSpec[0].equalsIgnoreCase(InvokerServerHttpHandler.RUN_PREFIX)) {
				responseBuffer = new InvokerInfoBuffer();
				invoker.appendRunValue(responseBuffer, URLDecoder.decode(uriSpec[1], "UTF-8"));
			} else if (uriSpec[0].startsWith(InvokerServerHttpHandler.MAIN_PREFIX)) {
				responseBuffer = mainHtmlBuffer.clone();
			} else if (uriSpec[0].equalsIgnoreCase(InvokerServerHttpHandler.JS_PREFIX)) {
				responseBuffer = new InvokerInfoBuffer();
				responseBuffer.appendString(MetaUtil.getResourceAsString(
						URLDecoder.decode(request.getUri().substring(contextPrefix.length()), "UTF-8")));
			} else {
				responseBuffer = InvokerService.this.processRequest(request, uriSpec);
			}
			return responseBuffer;
		}

		/*
		 * (non-Javadoc)
		 *
		 * @see io.netty.channel.ChannelHandlerAdapter#exceptionCaught(io.netty.
		 * channel .ChannelHandlerContext, java.lang.Throwable)
		 */
		@Override
		public void exceptionCaught(final ChannelHandlerContext ctx, final Throwable cause) throws Exception {
			// super.exceptionCaught(ctx, cause);
			ctx.disconnect();
		}

		/*
		 * (non-Javadoc)
		 *
		 * @see
		 * io.netty.channel.SimpleChannelInboundHandler#channelRead0(io.netty.
		 * channel .ChannelHandlerContext, java.lang.Object)
		 */
		@Override
		public void channelRead0(final ChannelHandlerContext ctx, final FullHttpRequest request) throws Exception {
			// URLDecoder.decode(request.getUri(), CharsetUtil.UTF_8.name());
			ByteBuf buf = defaultBuffer.byteBuf;
			if (request.getMethod().compareTo(HttpMethod.OPTIONS) != 0) {
				buf = processRequest(request).byteBuf;
			}
			final FullHttpResponse response = new DefaultFullHttpResponse(HttpVersion.HTTP_1_1, HttpResponseStatus.OK,
					buf, false);
			response.headers().add("Access-Control-Allow-Origin", "*");
			response.headers().add("Access-Control-Allow-Headers", "Content-Type");
			ctx.writeAndFlush(response).addListener(ChannelFutureListener.CLOSE);
			// buffer.close();
		}

	}

	/**
	 * Invoker server HTTP initializer.
	 *
	 * @author Dinesh Ilindra
	 */
	public class InvokerServerHttpInitializer extends ChannelInitializer<SocketChannel> {

		private final InvokerServerHttpHandler handler = new InvokerServerHttpHandler();

		/**
		 * @return the handler
		 */
		public InvokerServerHttpHandler getHandler() {
			return handler;
		}

		/*
		 * (non-Javadoc)
		 *
		 * @see
		 * io.netty.channel.ChannelInitializer#initChannel(io.netty.channel.
		 * Channel )
		 */
		@Override
		public void initChannel(final SocketChannel channel) throws Exception {
			final ChannelPipeline pipeline = channel.pipeline();
			pipeline.addLast("encoder", new HttpResponseEncoder());
			pipeline.addLast("decoder", new HttpRequestDecoder());
			pipeline.addLast("aggregator", new HttpObjectAggregator(2 * Short.MAX_VALUE));
			pipeline.addLast("handler", handler);
		}

	}

	public static final String SLASH = "/";

	private static final Object[] EMPTY_OBJECT_ARRAY = new Object[] {};

	private final Gson gson = new Gson();

	private final NettyServerRef<InvokerServerHttpInitializer> nettyServerRef = new NettyServerRef<InvokerService.InvokerServerHttpInitializer>(
			new ServerBootstrap(), new InvokerServerHttpInitializer(), new NioEventLoopGroup(), new NioEventLoopGroup(),
			NioServerSocketChannel.class);

	private final URIInvoker invoker;

	private int port;

	private String contextPrefix = "";

	private SimpleWebServer nanoServer;

	private String extjsResourcePrefix = "https://cdn.rawgit.com/bluejeansnet/jin/master/src/main/resources/js/extjs";

	private String invokerjsResourcePrefix = "https://rawgit.com/bluejeansnet/jin/master/src/main/resources/js/jin";

	private boolean locaclJsEnabled = false;

	private volatile boolean running;

	/**
	 * the default one
	 */
	public InvokerService() {
		this(5678, InvokerService.EMPTY_OBJECT_ARRAY);
	}

	/**
	 * @param port
	 *            the port to use
	 * @param targets
	 *            the targets
	 */
	public InvokerService(final int port, final Object... targets) {
		this.port = port;
		invoker = new URIInvoker(targets);
		invoker.setTarget("service", this);
	}

	/**
	 * @param targetMap
	 *            the target map
	 * @param port
	 *            the port to use
	 */
	public InvokerService(final int port, final Map<String, Object> targetMap) {
		this.port = port;
		invoker = new URIInvoker(targetMap);
		invoker.setTarget("service", this);
	}

	/**
	 * Process the given request and URI spec.
	 *
	 * @param request
	 *            the http request
	 * @param uriSpec
	 *            the URI specification
	 * @return the response buffer
	 */
	public InvokerInfoBuffer processRequest(final FullHttpRequest request, final String[] uriSpec) {
		return nettyServerRef.getChannelInitializer().getHandler().defaultBuffer;
	}

	/**
	 * Start
	 */
	public void start() {
		start("");
	}

	/**
	 * Start with context.
	 *
	 * @param contextPrefix
	 *            the context prefix
	 */
	public void start(final String contextPrefix) {
		if (running) {
			return;
		}
		if (contextPrefix.trim().isEmpty() || contextPrefix.startsWith("/")) {
			this.contextPrefix = contextPrefix.trim();
		} else {
			this.contextPrefix = SLASH + contextPrefix.trim();
		}
		// Initialize Netty.
		ChannelFuture future = null;
		nettyServerRef.initServerBootstrap();
		int currentPort = port;
		try {
			currentPort = MetaUtil.availablePort(port, 100);
			nettyServerRef.initWithPort(currentPort);
			future = nettyServerRef.getServerBootstrap().bind().syncUninterruptibly();
		} catch (final Exception ex) {
			currentPort = MetaUtil.availablePort(port, 100);
			nettyServerRef.initWithPort(currentPort);
			future = nettyServerRef.getServerBootstrap().bind().syncUninterruptibly();
		}
		if (locaclJsEnabled) {
			nettyServerRef.getChannelInitializer().getHandler().mainHtmlBuffer.appendString(MetaUtil
					.getResourceAsString("/jin.html").replaceAll("<extjsPrefix>", this.contextPrefix + "/js/extjs")
					.replaceAll("<invokerjsPrefix>", this.contextPrefix + "/js/jin"));
		} else {
			nettyServerRef.getChannelInitializer().getHandler().mainHtmlBuffer.appendString(
					MetaUtil.getResourceAsString("/jin.html").replaceAll("<extjsPrefix>", extjsResourcePrefix)
							.replaceAll("<invokerjsPrefix>", invokerjsResourcePrefix));
		}
		final ChannelFuture serverFuture = future;
		new Thread(new Runnable() {
			/*
			 * (non-Javadoc)
			 *
			 * @see java.lang.Runnable#run()
			 */
			@Override
			public void run() {
				serverFuture.channel().closeFuture().syncUninterruptibly();
			}
		}, InvokerService.class.getSimpleName());
		nanoServer = new SimpleWebServer("0.0.0.0", MetaUtil.availablePort(10000 + currentPort, 100), new File(SLASH),
				true, "*");
		// nanoServer.start();
		running = true;
	}

	/**
	 * Stop.
	 */
	public void stop() {
		running = false;
		// Destroy Netty.
		nettyServerRef.shutdown();
		nanoServer.stop();
	}

	/**
	 * @return the port
	 */
	public int getPort() {
		return port;
	}

	/**
	 * @param port
	 *            the port to set
	 */
	public void setPort(final int port) {
		if (!running) {
			this.port = port;
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
		if (!running) {
			this.contextPrefix = contextPrefix;
		}
	}

	/**
	 * @return the gson
	 */
	public Gson getGson() {
		return gson;
	}

	/**
	 * @return the nettyServerRef
	 */
	public NettyServerRef<InvokerServerHttpInitializer> getNettyServerRef() {
		return nettyServerRef;
	}

	/**
	 * @return the invoker
	 */
	public URIInvoker getInvoker() {
		return invoker;
	}

	/**
	 * @return the nanoServer
	 */
	public SimpleWebServer getNanoServer() {
		return nanoServer;
	}

	/**
	 * @return the running
	 */
	public boolean isRunning() {
		return running;
	}

	/**
	 * @return the extjsResourcePrefix
	 */
	public String getExtjsResourcePrefix() {
		return extjsResourcePrefix;
	}

	/**
	 * @param extjsResourcePrefix
	 *            the extjsResourcePrefix to set
	 */
	public void setExtjsResourcePrefix(final String extjsResourcePrefix) {
		this.extjsResourcePrefix = extjsResourcePrefix;
	}

	/**
	 * @return the invokerjsResourcePrefix
	 */
	public String getInvokerjsResourcePrefix() {
		return invokerjsResourcePrefix;
	}

	/**
	 * @param invokerjsResourcePrefix
	 *            the invokerjsResourcePrefix to set
	 */
	public void setInvokerjsResourcePrefix(final String invokerjsResourcePrefix) {
		this.invokerjsResourcePrefix = invokerjsResourcePrefix;
	}

	/**
	 * @return the locaclJsEnabled
	 */
	public boolean isLocaclJsEnabled() {
		return locaclJsEnabled;
	}

	/**
	 * @param locaclJsEnabled
	 *            the locaclJsEnabled to set
	 */
	public void setLocaclJsEnabled(boolean locaclJsEnabled) {
		this.locaclJsEnabled = locaclJsEnabled;
	}

	/**
	 * The singleton instance.
	 */
	private static InvokerService service = new InvokerService();

	/**
	 * Returns the singleton instance.
	 *
	 * @return the singleton instance
	 */
	public static InvokerService instance() {
		return InvokerService.service;
	}

	/**
	 * Start the singleton instance with given targets.
	 *
	 * @param targets
	 *            the targets
	 */
	public static void start(final Object... targets) {
		InvokerService.service.invoker.addTargets(targets);
		InvokerService.service.start();
	}

	/**
	 * The starter for command line.
	 *
	 * @param args
	 *            the arguments
	 */
	public static void main(final String[] args) {
		int port = 5678;
		String context = "";
		if (args.length > 0) {
			port = Integer.parseInt(args[0]);
		}
		if (args.length > 1) {
			context = args[1];
		}
		InvokerService.service.setPort(port);
		InvokerService.service.start(context);
	}

}
